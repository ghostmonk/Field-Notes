import React from 'react';
import Head from 'next/head';
import { GetStaticProps } from 'next';
import { StoryList } from '@/modules/stories';
import { SkeletonShowcase } from '@/components/LoadingSkeletons';
import { Story, PaginatedResponse } from '@/shared/types/api';
import { getSiteConfig } from '@/config';

interface HomeProps {
    initialStories?: PaginatedResponse<Story>;
    storySectionSlug?: string | null;
    error?: string;
}

const config = getSiteConfig();

const Home: React.FC<HomeProps> = ({ initialStories, storySectionSlug, error }) => {
    return (
        <>
            <Head>
                <title>{config.site.title}</title>
                <meta name="description" content={config.site.tagline}/>
                <meta name="keywords" content={`${config.site.title}, blog, stories, projects`}/>
            </Head>

            {/* Skeleton showcase for testing - add ?skeleton=test to URL */}
            <SkeletonShowcase />

            <div style={{margin: '0 auto', maxWidth: '800px', padding: '0 1rem'}}>
                {config.hero.showOnHome && (
                    <header className="hero">
                        <p className="hero__subtitle">{config.site.tagline}</p>
                    </header>
                )}
                <StoryList initialData={initialStories} initialError={error} basePath={storySectionSlug ? `/${storySectionSlug}` : undefined} featureFirst />
            </div>
        </>
    );
};

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
    try {
        const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

        if (!backendUrl) {
            return {
                props: {
                    error: 'Backend URL not configured'
                },
                revalidate: 60,
            };
        }

        // Fetch initial stories for ISR
        const response = await fetch(`${backendUrl}/stories?limit=5&offset=0&include_drafts=false`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch stories: ${response.status}`);
        }

        const data: PaginatedResponse<Story> = await response.json();

        // Resolve the story section slug for links
        let storySectionSlug: string | undefined;
        try {
            const sectionsRes = await fetch(`${backendUrl}/sections`);
            if (sectionsRes.ok) {
                const sectionsData = await sectionsRes.json();
                const storySection = sectionsData.items.find((s: { content_type: string }) => s.content_type === 'story');
                if (storySection) {
                    storySectionSlug = storySection.path || storySection.slug;
                }
            }
        } catch {
            // Non-fatal — links will fall back to /stories
        }

        return {
            props: {
                initialStories: data,
                storySectionSlug: storySectionSlug || null,
            },
            revalidate: 300,
        };
    } catch (error) {
        console.error('Error in getStaticProps:', error);

        return {
            props: {
                error: error instanceof Error ? error.message : 'Failed to load stories'
            },
            revalidate: 60,
        };
    }
};

export default Home;
