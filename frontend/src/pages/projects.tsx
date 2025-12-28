import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ProjectCard } from '@/types/api';

const ProjectsPage: React.FC = () => {
    const [projects, setProjects] = useState<ProjectCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await apiClient.projects.list();
                setProjects(data.items);
            } catch (err: any) {
                setError('Failed to load projects.');
                console.error('Error fetching projects:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    return (
        <>
            <Head>
                <title>Projects | Turbulence</title>
                <meta name="description" content="Projects and work by Ghostmonk" />
            </Head>

            <div style={{ margin: '0 auto', maxWidth: '800px', padding: '0 1rem' }}>
                <h1 className="page-title">Projects</h1>

                {loading && (
                    <p className="text-text-secondary">Loading projects...</p>
                )}

                {error && (
                    <p className="text-text-secondary">{error}</p>
                )}

                {!loading && !error && projects.length === 0 && (
                    <div className="card">
                        <p className="text-text-secondary">No projects yet.</p>
                    </div>
                )}

                {!loading && !error && projects.length > 0 && (
                    <div className="grid grid--responsive">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.slug}`}
                                className="card card--hoverable"
                                style={{ textDecoration: 'none', display: 'block' }}
                            >
                                {project.image_url && (
                                    <Image
                                        src={project.image_url}
                                        alt={project.title}
                                        width={400}
                                        height={160}
                                        style={{
                                            width: '100%',
                                            height: '160px',
                                            objectFit: 'cover',
                                            borderRadius: '8px 8px 0 0',
                                            marginBottom: '1rem'
                                        }}
                                    />
                                )}

                                <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>
                                    {project.title}
                                    {project.is_featured && (
                                        <span
                                            style={{
                                                marginLeft: '0.5rem',
                                                fontSize: '0.75rem',
                                                padding: '0.125rem 0.5rem',
                                                backgroundColor: 'var(--color-brand-primary)',
                                                color: 'white',
                                                borderRadius: '4px',
                                                verticalAlign: 'middle'
                                            }}
                                        >
                                            Featured
                                        </span>
                                    )}
                                </h3>

                                <p className="text-text-secondary" style={{ marginBottom: '1rem' }}>
                                    {project.summary}
                                </p>

                                {project.technologies.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {project.technologies.map((tech) => (
                                            <span
                                                key={tech}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    padding: '0.25rem 0.5rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                    {project.github_url && (
                                        <span className="text-text-secondary" style={{ fontSize: '0.875rem' }}>
                                            GitHub
                                        </span>
                                    )}
                                    {project.live_url && (
                                        <span className="text-text-secondary" style={{ fontSize: '0.875rem' }}>
                                            Live Demo
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default ProjectsPage;
