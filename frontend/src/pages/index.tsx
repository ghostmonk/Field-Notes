import React from 'react';
import Head from 'next/head';
import { GetStaticProps } from 'next';
import { Story, ProjectCard, PhotoEssayCard, PaginatedResponse } from '@/shared/types/api';
import { getSiteConfig } from '@/config';
import { Homepage } from '@/modules/homepage';
import type { HomepageBlockConfig, HomepageData } from '@/modules/homepage';

const DEFAULT_BLOCKS: HomepageBlockConfig[] = [
    { type: 'identity-hero', id: 'hero' },
    { type: 'featured-story', id: 'featured' },
    { type: 'recent-writing', id: 'writing' },
];

interface HomeProps {
    blocks: HomepageBlockConfig[];
    data: HomepageData;
    error?: string;
}

const config = getSiteConfig();

const Home: React.FC<HomeProps> = ({ blocks, data, error }) => {
    if (error) {
        return (
            <>
                <Head>
                    <title>{config.site.title}</title>
                </Head>
                <div className="homepage">
                    <div className="error-state">
                        <h3 className="error-state__title">Unable to load content</h3>
                        <p className="error-state__message">{error}</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>{config.site.title}</title>
                <meta name="description" content={config.site.tagline} />
                <meta name="keywords" content={`${config.site.title}, blog, stories, projects, photography`} />
            </Head>
            <div className="homepage-container">
                <Homepage blocks={blocks} data={data} />
            </div>
        </>
    );
};

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
    const blocks: HomepageBlockConfig[] =
        (config.homepage?.blocks as HomepageBlockConfig[] | undefined) ?? DEFAULT_BLOCKS;

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

    if (!backendUrl) {
        return {
            props: {
                blocks,
                data: emptyData(),
                error: 'Backend URL not configured',
            },
            revalidate: 60,
        };
    }

    const blockTypes = new Set(blocks.map((b) => b.type));

    const [stories, projects, photoEssays, sectionPathMap] = await Promise.all([
        blockTypes.has('featured-story') || blockTypes.has('recent-writing')
            ? fetchJson<PaginatedResponse<Story>>(`${backendUrl}/stories?limit=6&offset=0&include_drafts=false`)
            : Promise.resolve(null),
        blockTypes.has('project-showcase')
            ? fetchJson<PaginatedResponse<ProjectCard>>(`${backendUrl}/projects?limit=6&offset=0`)
            : Promise.resolve(null),
        blockTypes.has('photo-strip')
            ? fetchJson<PaginatedResponse<PhotoEssayCard>>(`${backendUrl}/photo-essays?limit=5&offset=0`)
            : Promise.resolve(null),
        fetchSectionPathMap(backendUrl),
    ]);

    const allStories = stories?.items ?? [];
    const featuredStory = allStories.find((s) => s.is_published) ?? null;
    const recentStories = featuredStory
        ? allStories.filter((s) => s.id !== featuredStory.id && s.is_published).slice(0, 5)
        : allStories.filter((s) => s.is_published).slice(0, 5);

    return {
        props: {
            blocks,
            data: {
                stories: recentStories,
                featuredStory,
                projects: (projects?.items ?? []).filter((p) => p.is_published),
                photoEssays: (photoEssays?.items ?? []).filter((pe) => pe.is_published),
                sectionPathMap,
            },
        },
        revalidate: 300,
    };
};

function emptyData(): HomepageData {
    return {
        stories: [],
        featuredStory: null,
        projects: [],
        photoEssays: [],
        sectionPathMap: {},
    };
}

async function fetchJson<T>(url: string): Promise<T | null> {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function fetchSectionPathMap(backendUrl: string): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    try {
        const res = await fetch(`${backendUrl}/sections?limit=100`, {
            signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
            const data = await res.json();
            for (const s of data.items) {
                map[s.id] = s.path || s.slug;
            }
        }
    } catch {
        // Non-fatal
    }
    return map;
}

export default Home;
