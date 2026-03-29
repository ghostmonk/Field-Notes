import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Section, Story, Project, Page, PaginatedResponse, ProjectCard as ProjectCardType, PhotoEssayCard as PhotoEssayCardType, PhotoEssay, BulkCountsResponse } from '@/shared/types/api';
import { displayRegistry, useFetchContent } from '@/modules/registry';
import type { ContentType, DisplayType } from '@/modules/registry';
import { StoryCard, canEditStory } from '@/modules/stories';
import { useStoryMutations } from '@/modules/stories';
import { ContributionGraph, ProjectCard } from '@/modules/projects';
import { PhotoEssayCard, PhotoEssayPage } from '@/modules/photo-essays';
import { ProjectDetail } from '@/modules/projects';
import { StoryDetail } from '@/modules/stories';
import { EngagementProvider, ReactionBar, CommentSection, useEngagementContext } from '@/modules/engagement';
import { Button } from '@/components/ui';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/EmptyState';
import { getBaseUrl, getCanonicalUrl } from '@/shared/utils/urls';
import { processStoryDataSSR } from '@/rendering/server';
import apiClient from '@/shared/lib/api-client';
import dynamic from 'next/dynamic';
const ContactForm = dynamic(() => import('@/modules/static/pages/ContactForm').then(mod => ({ default: mod.ContactForm })), { ssr: false });

interface SectionPageProps {
    section: Section;
    view: 'list' | 'detail' | 'static-page';
    initialListData?: PaginatedResponse<any>;
    detailItem?: Story | Project | PhotoEssay | null;
    pageContent?: Page | null;
    ogImage?: string;
    excerpt?: string;
    error?: string;
}

function StoryEngagement() {
    const { reactions, comments, isLoading, toggleReaction, addComment, deleteComment } = useEngagementContext();

    return (
        <>
            <div className="mt-8 border-t pt-8">
                <ReactionBar
                    reactions={reactions}
                    onToggle={toggleReaction}
                />
            </div>
            <div className="mt-8">
                <CommentSection
                    comments={comments}
                    onAddComment={addComment}
                    onDeleteComment={deleteComment}
                    isLoading={isLoading}
                />
            </div>
        </>
    );
}

function SectionListView({ section, initialListData }: { section: Section; initialListData?: PaginatedResponse<any> }) {
    const contentType = (section.content_type || 'story') as ContentType;
    const displayType = section.display_type as DisplayType;
    const { data: session } = useSession();
    const router = useRouter();
    const { deleteStory, loading: deleteLoading } = useStoryMutations();
    const confirm = useConfirm();
    const { showToast } = useToast();
    const [engagementCounts, setEngagementCounts] = useState<BulkCountsResponse['counts']>({});

    const { items, loading, error, hasMore, loadMore, reset } = useFetchContent({
        contentType,
        sectionId: section.id,
        initialData: initialListData,
    });

    // Fetch engagement counts only for newly loaded stories
    useEffect(() => {
        if (contentType !== 'story') return;
        const publishedStories = (items as Story[]).filter(s => s.is_published);
        const newStories = publishedStories.filter(s => !engagementCounts[`story:${s.id}`]);
        if (newStories.length === 0) return;

        const fetchCounts = async () => {
            try {
                const targets = newStories.map(s => ({ type: 'story', id: s.id }));
                const response = await apiClient.engagement.getBulkCounts({ targets });
                setEngagementCounts(prev => ({ ...prev, ...response.counts }));
            } catch (err) {
                console.error('Failed to fetch engagement counts:', err);
            }
        };

        fetchCounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- engagementCounts excluded to avoid refetch loop
    }, [items, contentType]);

    const handleEdit = useCallback((story: Story) => {
        if (!session) {
            router.push('/api/auth/signin');
            return;
        }
        router.push({ pathname: '/editor', query: { id: story.id, section_id: section.id } });
    }, [session, router, section.id]);

    const handleDelete = useCallback(async (story: Story) => {
        if (!session) {
            router.push('/api/auth/signin');
            return;
        }
        const confirmed = await confirm({
            title: 'Delete Story',
            message: `Are you sure you want to delete "${story.title}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            destructive: true,
        });
        if (!confirmed) return;
        const success = await deleteStory(story.id);
        if (success) {
            showToast('Story deleted');
            reset();
        }
    }, [session, router, deleteStory, reset, confirm, showToast]);

    const basePath = `/${section.path || section.slug}`;

    const renderItem = useMemo(() => {
        if (contentType === 'story') {
            return (item: unknown) => {
                const story = item as Story;
                return (
                    <StoryCard
                        key={story.id}
                        story={story}
                        session={session}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        deleteLoading={deleteLoading}
                        engagementCounts={engagementCounts[`story:${story.id}`]}
                        basePath={basePath}
                    />
                );
            };
        }
        if (contentType === 'project') {
            return (item: unknown) => {
                const project = item as ProjectCardType;
                return <ProjectCard key={project.id} project={project} basePath={basePath} />;
            };
        }
        if (contentType === 'photo_essay') {
            return (item: unknown) => {
                const essay = item as PhotoEssayCardType;
                return <PhotoEssayCard key={essay.id} essay={essay} basePath={basePath} />;
            };
        }
        return (item: unknown) => {
            const data = item as { id: string; title: string };
            return <div key={data.id}>{data.title}</div>;
        };
    }, [contentType, session, handleEdit, handleDelete, deleteLoading, engagementCounts, basePath]);

    if (error) {
        return (
            <div className="error-state">
                <h3 className="error-state__title">Error Loading Content</h3>
                <p className="error-state__message">{error}</p>
                <button onClick={reset} className="btn btn--primary">Try Again</button>
            </div>
        );
    }

    if (items.length === 0 && loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="loading-title">Loading...</div>
            </div>
        );
    }

    if (items.length === 0 && !loading) {
        return (
            <EmptyState
                title={`No ${section.title.toLowerCase()} yet`}
                description="Check back later for new content."
            />
        );
    }

    const DisplayComponent = displayRegistry[displayType];

    if (displayType === 'gallery') {
        return (
            <DisplayComponent
                items={items}
                renderItem={renderItem}
            />
        );
    }

    if (displayType === 'feed') {
        return (
            <DisplayComponent
                items={items}
                renderItem={renderItem}
                onLoadMore={loadMore}
                hasMore={hasMore}
                keyExtractor={(item: any, index: number) => item.id ?? item.slug ?? String(index)}
            />
        );
    }

    return (
        <DisplayComponent
            items={items}
            renderItem={renderItem}
        />
    );
}

function PhotoEssayDetailView({ section, essay }: { section: Section; essay: PhotoEssay }) {
    const { data: session } = useSession();
    const router = useRouter();
    const confirm = useConfirm();
    const { showToast } = useToast();

    const handleEdit = useCallback(() => {
        router.push({ pathname: '/editor', query: { id: essay.id, section_id: section.id } });
    }, [router, essay.id, section.id]);

    const handleDelete = useCallback(async () => {
        if (!session?.accessToken) return;
        const confirmed = await confirm({
            title: 'Delete Photo Essay',
            message: `Are you sure you want to delete "${essay.title}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            destructive: true,
        });
        if (!confirmed) return;
        try {
            await apiClient.photoEssays.delete(essay.id, session.accessToken);
            showToast('Photo essay deleted');
            router.push(`/${section.path || section.slug}`);
        } catch {
            showToast('Failed to delete photo essay');
        }
    }, [session, essay.id, essay.title, section.path, section.slug, router, confirm, showToast]);

    const isAdmin = session?.user?.role === 'admin';

    return (
        <div className="page-container">
            <Breadcrumbs items={[
                { label: section.title, href: `/${section.path || section.slug}` },
                { label: essay.title },
            ]} />
            <PhotoEssayPage
                essay={essay}
                onEdit={isAdmin ? handleEdit : undefined}
                onDelete={isAdmin ? handleDelete : undefined}
            />
        </div>
    );
}

function SectionDetailView({ section, item }: { section: Section; item: Story | Project | PhotoEssay }) {
    const contentType = (section.content_type ||
        ('content' in item ? 'story' :
         'technologies' in item ? 'project' :
         'photos' in item ? 'photo_essay' : 'story')) as ContentType;
    const { data: session } = useSession();
    const router = useRouter();

    if (contentType === 'story') {
        const story = item as Story;
        const handleEdit = canEditStory(session, story)
            ? () => router.push({ pathname: '/editor', query: { id: story.id, section_id: section.id } })
            : undefined;
        return (
            <div className="detail-container">
                <Breadcrumbs items={[
                    { label: section.title, href: `/${section.path || section.slug}` },
                    { label: story.title },
                ]} />
                <EngagementProvider targetType="story" targetId={story.id}>
                    <StoryDetail story={story} onEdit={handleEdit}>
                        <StoryEngagement />
                    </StoryDetail>
                </EngagementProvider>
            </div>
        );
    }

    if (contentType === 'project') {
        const project = item as Project;
        const handleEdit = session?.user?.role === 'admin'
            ? () => router.push({ pathname: '/editor', query: { id: project.id, section_id: section.id } })
            : undefined;
        return (
            <div className="page-container">
                <Breadcrumbs items={[
                    { label: section.title, href: `/${section.path || section.slug}` },
                    { label: project.title },
                ]} />
                <ProjectDetail project={project} onEdit={handleEdit} />
            </div>
        );
    }

    if (contentType === 'photo_essay') {
        const essay = item as PhotoEssay;
        return (
            <PhotoEssayDetailView section={section} essay={essay} />
        );
    }

    return <div>Unsupported content type</div>;
}

export default function SectionPage({ section, view, initialListData, detailItem, pageContent, ogImage, excerpt, error }: SectionPageProps) {
    const canonicalUrl = getCanonicalUrl();
    const { data: session } = useSession();
    const router = useRouter();

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="error-state">
                    <h3 className="error-state__title">Error</h3>
                    <p className="error-state__message">{error}</p>
                    <div className="flex gap-3 mt-4 justify-center">
                        <button onClick={() => window.location.reload()} className="btn btn--primary" data-testid="error-retry">
                            Try Again
                        </button>
                        <Link href="/" className="btn btn--secondary">Return Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'static-page' && pageContent) {
        const StaticDisplay = displayRegistry['static-page'];
        return (
            <>
                <Head>
                    <title>{`${pageContent.title || section.title} | Field Notes`}</title>
                    <meta property="og:title" content={pageContent.title || section.title} />
                    <meta property="og:type" content="website" />
                    <link rel="canonical" href={canonicalUrl} />
                </Head>
                <StaticDisplay content={pageContent.content} title={pageContent.title} />
                {session?.user?.role === 'admin' && (
                    <div className="page-container flex justify-end mt-4">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push({ pathname: '/editor', query: { section_id: section.id } })}
                            data-testid="page-edit-button"
                        >
                            Edit
                        </Button>
                    </div>
                )}
                {section.slug === 'contact' && (
                    <div className="page-container mt-6">
                        <ContactForm />
                    </div>
                )}
            </>
        );
    }

    if (view === 'detail' && detailItem) {
        const title = 'title' in detailItem ? detailItem.title : section.title;
        return (
            <>
                <Head>
                    <title>{`${title} | Field Notes`}</title>
                    <meta name="description" content={excerpt || `${title} on ghostmonk.com`} />
                    <meta property="og:title" content={title} />
                    <meta property="og:description" content={excerpt || `${title} on ghostmonk.com`} />
                    <meta property="og:type" content="article" />
                    <meta property="og:url" content={canonicalUrl} />
                    {ogImage && <meta property="og:image" content={ogImage} />}
                    <link rel="canonical" href={canonicalUrl} />
                </Head>
                <SectionDetailView section={section} item={detailItem} />
            </>
        );
    }

    return (
        <>
            <Head>
                <title>{`${section.title} | Field Notes`}</title>
                <meta property="og:title" content={section.title} />
                <meta property="og:type" content="website" />
                <link rel="canonical" href={canonicalUrl} />
            </Head>
            <div className="page-container">
                <h1 className="page-title">{section.title}</h1>
                {section.content_type === 'project' && <ContributionGraph />}
                <SectionListView section={section} initialListData={initialListData} />
            </div>
        </>
    );
}

export const getServerSideProps: GetServerSideProps<SectionPageProps> = async (context) => {
    const { slugPath } = context.params || {};
    const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!API_BASE_URL) {
        return { props: { section: {} as Section, view: 'list', error: 'Backend URL not configured' } };
    }

    if (!slugPath || !Array.isArray(slugPath) || slugPath.length === 0) {
        return { notFound: true };
    }

    const fullPath = slugPath.join('/');

    try {
        // Resolve the path via the new endpoint
        const resolveRes = await fetch(`${API_BASE_URL}/sections/resolve-path/${fullPath}`, {
            redirect: 'manual',
        });

        // Handle redirects
        if (resolveRes.status === 301) {
            const location = resolveRes.headers.get('location');
            if (location) {
                return { redirect: { destination: location, permanent: true } };
            }
            return { notFound: true };
        }

        if (!resolveRes.ok) {
            return { notFound: true };
        }

        const resolved = await resolveRes.json();

        // Content item detail view
        if (resolved.type === 'content') {
            const section = resolved.section as Section;
            const contentItem = resolved.content_item;
            const contentType = contentItem.content_type;

            let detailItem: Story | Project | PhotoEssay | null = null;
            let ogImage: string | undefined;
            let excerpt: string | undefined;

            if (contentType === 'story') {
                const storyRes = await fetch(`${API_BASE_URL}/stories/slug/${contentItem.slug}`);
                if (storyRes.ok) {
                    const story: Story = await storyRes.json();
                    detailItem = story;
                    const ssrData = await processStoryDataSSR(story);
                    ogImage = ssrData.ogImage;
                    excerpt = ssrData.excerpt;
                }
            } else if (contentType === 'project') {
                const projectRes = await fetch(`${API_BASE_URL}/projects/slug/${contentItem.slug}`);
                if (projectRes.ok) {
                    const project: Project = await projectRes.json();
                    detailItem = project;
                    excerpt = project.summary;
                }
            } else if (contentType === 'photo_essay') {
                const essayRes = await fetch(`${API_BASE_URL}/photo-essays/${contentItem.slug}`);
                if (essayRes.ok) {
                    const essay: PhotoEssay = await essayRes.json();
                    detailItem = essay;
                    ogImage = essay.cover_image_url;
                    excerpt = essay.description;
                }
            }

            if (!detailItem) {
                return { notFound: true };
            }

            return {
                props: {
                    section: { ...section, content_type: contentType } as Section,
                    view: 'detail',
                    detailItem,
                    ogImage: ogImage || `${getBaseUrl()}/images/default-og.png`,
                    excerpt: excerpt || '',
                },
            };
        }

        // Section view
        const section = resolved.section as Section;
        const displayType = section.display_type;

        // Static page view
        if (displayType === 'static-page') {
            try {
                const pageSlug = slugPath[slugPath.length - 1];
                const pageRes = await fetch(`${API_BASE_URL}/pages/${pageSlug}`);
                if (pageRes.ok) {
                    const pageContent: Page = await pageRes.json();
                    return { props: { section, view: 'static-page', pageContent } };
                }
                return { props: { section, view: 'static-page', pageContent: null } };
            } catch {
                return { props: { section, view: 'static-page', pageContent: null } };
            }
        }

        // List view — fetch children
        try {
            const childrenRes = await fetch(`${API_BASE_URL}/sections/${section.id}/children?limit=20&offset=0`);
            let initialListData: PaginatedResponse<any> | undefined;
            if (childrenRes.ok) {
                initialListData = await childrenRes.json();
            }

            // Infer content_type from the first child item for backward compatibility
            const sectionWithContentType = { ...section };
            if (initialListData?.items?.length) {
                const firstContentItem = initialListData.items.find((item: any) => item.item_type === 'content');
                if (firstContentItem?.content_type) {
                    sectionWithContentType.content_type = firstContentItem.content_type;
                }
            }

            return {
                props: {
                    section: sectionWithContentType as Section,
                    view: 'list',
                    initialListData: initialListData || { items: [], total: 0, limit: 20, offset: 0 },
                },
            };
        } catch {
            return {
                props: {
                    section,
                    view: 'list',
                    initialListData: { items: [], total: 0, limit: 20, offset: 0 },
                },
            };
        }
    } catch {
        return { notFound: true };
    }
};
