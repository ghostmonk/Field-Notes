import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import apiClient from '@/shared/lib/api-client';
import { ProjectCard as ProjectCardType } from '@/shared/types/api';
import { ProjectCard } from '@/modules/projects';

const ProjectsPage: React.FC = () => {
    const [projects, setProjects] = useState<ProjectCardType[]>([]);
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
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default ProjectsPage;
