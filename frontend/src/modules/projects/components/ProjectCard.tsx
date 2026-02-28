import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ProjectCard as ProjectCardType } from '@/shared/types/api';

interface ProjectCardProps {
    project: ProjectCardType;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
    return (
        <Link
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
    );
};
