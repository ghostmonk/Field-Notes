import React, { useEffect, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import apiClient from '@/shared/lib/api-client';
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
            } catch (err: unknown) {
                const apiError = err as { status?: number };
                if (apiError?.status === 404) {
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
            <div className="page-container">
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
                <div className="page-container">
                    <h1 className="page-title">Project Not Found</h1>
                    <div className="card">
                        <p className="text-text-secondary">{error || 'Project not found.'}</p>
                        <Link href="/projects" className="btn btn--primary mt-lg inline-block">
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

            <div className="page-container">
                <Link href="/projects" className="text-text-secondary back-link">
                    &larr; Back to Projects
                </Link>

                {project.image_url && (
                    <Image
                        src={project.image_url}
                        alt={project.title}
                        width={800}
                        height={400}
                        className="project-image--hero"
                    />
                )}

                <h1 className="page-title mb-sm">
                    {project.title}
                    {project.is_featured && (
                        <span className="badge--featured">
                            Featured
                        </span>
                    )}
                </h1>

                <p className="text-text-secondary text-lg mb-xl">
                    {project.summary}
                </p>

                {project.technologies.length > 0 && (
                    <div className="tech-tags mb-xl">
                        {project.technologies.map((tech) => (
                            <span key={tech} className="tech-tag tech-tag--lg">
                                {tech}
                            </span>
                        ))}
                    </div>
                )}

                <div className="project-actions">
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
