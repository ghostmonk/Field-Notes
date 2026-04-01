import React from 'react';
import Image from 'next/image';
import DOMPurify from 'isomorphic-dompurify';
import { Project } from '@/shared/types/api';
import { Card, Badge, Button } from '@/components/ui';
import { AdminEditButton } from '@/components/AdminEditButton';

interface ProjectDetailProps {
    project: Project;
    onEdit?: () => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onEdit }) => {
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

            <div className="flex items-center justify-between mb-sm">
                <h1 className="page-title">
                    {project.title}
                    {project.is_featured && (
                        <Badge variant="featured">
                            Featured
                        </Badge>
                    )}
                </h1>
                <AdminEditButton
                    onClick={onEdit}
                    data-testid="project-edit-button"
                />
            </div>

            <p className="text-text-secondary text-lg mb-xl">
                {project.summary}
            </p>

            {project.technologies?.length > 0 && (
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
                    <Button
                        as="a"
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="secondary"
                    >
                        View on GitHub
                    </Button>
                )}
                {project.live_url && (
                    <Button
                        as="a"
                        href={project.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="primary"
                    >
                        Live Demo
                    </Button>
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
