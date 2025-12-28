import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/api-client';
import { Page } from '@/types/api';

const AboutPage: React.FC = () => {
    const [page, setPage] = useState<Page | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                const data = await apiClient.pages.get('about');
                setPage(data);
            } catch (err: any) {
                if (err?.status === 404) {
                    setError('Page not found. Content has not been added yet.');
                } else {
                    setError('Failed to load page content.');
                }
                console.error('Error fetching about page:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPage();
    }, []);

    return (
        <>
            <Head>
                <title>{page?.title || 'About'} | Turbulence</title>
                <meta name="description" content="About Ghostmonk and Turbulence" />
            </Head>

            <div style={{ margin: '0 auto', maxWidth: '800px', padding: '0 1rem' }}>
                <h1 className="page-title">{page?.title || 'About'}</h1>

                <div className="card">
                    <div className="prose prose--card">
                        {loading && (
                            <p className="text-text-secondary">Loading...</p>
                        )}

                        {error && (
                            <p className="text-text-secondary">{error}</p>
                        )}

                        {!loading && !error && page && (
                            <div dangerouslySetInnerHTML={{ __html: page.content }} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AboutPage;
