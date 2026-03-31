import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProjectCard as ProjectCardType } from '@/shared/types/api';
import { Card, Badge } from '@/components/ui';
import { AdminEditButton } from '@/components/AdminEditButton';
import { AdminDraftBadge } from '@/components/AdminDraftBadge';

interface ProjectCardProps {
    project: ProjectCardType;
    basePath?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, basePath }) => {
    const router = useRouter();

    return (
        <Link href={`${basePath || '/projects'}/${project.slug}`} className="card--link">
            <Card hoverable>
                <div className="card__admin-actions">
                    <AdminDraftBadge isPublished={project.is_published} />
                    <AdminEditButton
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            router.push({ pathname: '/editor', query: { id: project.id, section_id: project.section_id } });
                        }}
                        data-testid={`project-edit-${project.id}`}
                    />
                </div>
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
                        <Badge variant="featured">
                            Featured
                        </Badge>
                    )}
                </h3>

                <p className="text-text-secondary mb-lg">
                    {project.summary}
                </p>

                {project.technologies?.length > 0 && (
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
            </Card>
        </Link>
    );
};
