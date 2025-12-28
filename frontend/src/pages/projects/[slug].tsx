import React, { useEffect, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import apiClient from '@/lib/api-client';
import { Project } from '@/types/api';

const ProjectDetailPage: React.FC = () => {
    const router = useRouter();
    const { slug } = router.query;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug || typeof slug !== 'string') return;

        const fetchProject = async () => {
            try {
                const data = await apiClient.projects.getBySlug(slug);
                setProject(data);
            } catch (err: any) {
                if (err?.status === 404) {
                    setError('Project not found.');
                } else {
                    setError('Failed to load project.');
                }
                console.error('Error fetching project:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [slug]);

    if (loading) {
        return (
            <div style={{ margin: '0 auto', maxWidth: '800px', padding: '0 1rem' }}>
                <p className="text-text-secondary">Loading project...</p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <>
                <Head>
                    <title>Project Not Found | Turbulence</title>
                </Head>
                <div style={{ margin: '0 auto', maxWidth: '800px', padding: '0 1rem' }}>
                    <h1 className="page-title">Project Not Found</h1>
                    <div className="card">
                        <p className="text-text-secondary">{error || 'Project not found.'}</p>
                        <Link href="/projects" className="btn btn--primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                            Back to Projects
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>{`${project.title} | Turbulence`}</title>
                <meta name="description" content={project.summary} />
            </Head>

            <div style={{ margin: '0 auto', maxWidth: '800px', padding: '0 1rem' }}>
                <Link href="/projects" className="text-text-secondary" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                    &larr; Back to Projects
                </Link>

                {project.image_url && (
                    <Image
                        src={project.image_url}
                        alt={project.title}
                        width={800}
                        height={400}
                        style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '400px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            marginBottom: '1.5rem'
                        }}
                    />
                )}

                <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>
                    {project.title}
                    {project.is_featured && (
                        <span
                            style={{
                                marginLeft: '0.75rem',
                                fontSize: '0.875rem',
                                padding: '0.25rem 0.75rem',
                                backgroundColor: 'var(--color-brand-primary)',
                                color: 'white',
                                borderRadius: '4px',
                                verticalAlign: 'middle'
                            }}
                        >
                            Featured
                        </span>
                    )}
                </h1>

                <p className="text-text-secondary" style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>
                    {project.summary}
                </p>

                {project.technologies.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {project.technologies.map((tech) => (
                            <span
                                key={tech}
                                style={{
                                    fontSize: '0.875rem',
                                    padding: '0.375rem 0.75rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '4px'
                                }}
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    {project.github_url && (
                        <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn--secondary"
                        >
                            View on GitHub
                        </a>
                    )}
                    {project.live_url && (
                        <a
                            href={project.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn--primary"
                        >
                            Live Demo
                        </a>
                    )}
                </div>

                <div className="card">
                    <div className="prose prose--card">
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.content) }} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProjectDetailPage;
