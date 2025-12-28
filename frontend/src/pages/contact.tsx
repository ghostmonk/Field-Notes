import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import apiClient from '@/lib/api-client';
import { Page } from '@/types/api';

const ContactPage: React.FC = () => {
    const [page, setPage] = useState<Page | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                const data = await apiClient.pages.get('contact');
                setPage(data);
            } catch (err: any) {
                // 404 is expected if page hasn't been created yet
                if (err?.status !== 404) {
                    console.error('Error fetching contact page:', err);
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
                <title>{`${page?.title || 'Contact'} | Turbulence`}</title>
                <meta name="description" content="Get in touch with Ghostmonk" />
            </Head>

            <div style={{ margin: '0 auto', maxWidth: '800px', padding: '0 1rem' }}>
                <h1 className="page-title">{page?.title || 'Contact'}</h1>

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
                            <div dangerouslySetInnerHTML={{ __html: page.content }} />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ContactPage;
