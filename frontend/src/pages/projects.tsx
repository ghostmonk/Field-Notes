import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import apiClient from '@/shared/lib/api-client';
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
            } catch (err: unknown) {
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

            <div className="page-container">
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
                                className="card card--hoverable card--link"
                            >
                                {project.image_url && (
                                    <Image
                                        src={project.image_url}
                                        alt={project.title}
                                        width={400}
                                        height={160}
                                        className="project-image"
                                    />
                                )}

                                <h3 className="section-title mb-sm">
                                    {project.title}
                                    {project.is_featured && (
                                        <span className="badge--featured">
                                            Featured
                                        </span>
                                    )}
                                </h3>

                                <p className="text-text-secondary mb-lg">
                                    {project.summary}
                                </p>

                                {project.technologies.length > 0 && (
                                    <div className="tech-tags">
                                        {project.technologies.map((tech) => (
                                            <span key={tech} className="tech-tag">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="project-links">
                                    {project.github_url && (
                                        <span className="text-text-secondary text-sm">
                                            GitHub
                                        </span>
                                    )}
                                    {project.live_url && (
                                        <span className="text-text-secondary text-sm">
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
