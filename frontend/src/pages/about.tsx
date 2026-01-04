import React, { useEffect, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import Head from 'next/head';
import apiClient from '@/shared/lib/api-client';
import { Page } from '@/shared/types/api';

const AboutPage: React.FC = () => {
    const [page, setPage] = useState<Page | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                const data = await apiClient.pages.get('about');
                setPage(data);
            } catch (err: unknown) {
                // 404 is expected if page hasn't been created yet
                const apiError = err as { status?: number };
                if (apiError?.status !== 404) {
                    console.error('Error fetching about page:', err);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
    }, []);

    return (
        <>
            <Head>
                <title>{`${page?.title || 'About'} | Turbulence`}</title>
                <meta name="description" content="About Ghostmonk and Turbulence" />
            </Head>

            <div className="page-container">
                <h1 className="page-title">{page?.title || 'About'}</h1>

                {loading && (
                    <p className="text-text-secondary">Loading...</p>
                )}

                {!loading && !page && (
                    <div className="card">
                        <p className="text-text-secondary">No content yet.</p>
                    </div>
                )}

                {!loading && page && (
                    <div className="card">
                        <div className="prose prose--card">
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content) }} />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AboutPage;
