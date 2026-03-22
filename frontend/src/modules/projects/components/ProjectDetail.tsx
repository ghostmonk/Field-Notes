import React from 'react';
import Image from 'next/image';
import DOMPurify from 'isomorphic-dompurify';
import { Project } from '@/shared/types/api';
import { Card, Badge } from '@/components/ui';

interface ProjectDetailProps {
    project: Project;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project }) => {
    return (
        <>
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
                    <Badge variant="featured">
                        Featured
                    </Badge>
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

            <Card>
                <div className="prose prose--card">
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.content) }} />
                </div>
            </Card>
        </>
    );
};
