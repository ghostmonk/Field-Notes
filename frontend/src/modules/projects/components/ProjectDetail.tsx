import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Project } from '@/shared/types/api';
import { AdminEditButton } from '@/components/AdminEditButton';
import { formatDateShort } from '@/shared/utils/formatDate';

interface ProjectDetailProps {
    project: Project;
    onEdit?: () => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onEdit }) => {
    return (
        <article className="project-detail">
            <div className="project-detail__layout">
                <div className="project-detail__main">
                    <div className="project-detail__header">
                        <h1 className="project-detail__title">{project.title}</h1>
                        <AdminEditButton
                            onClick={onEdit}
                            data-testid="project-edit-button"
                        />
                    </div>
                    {project.is_featured && (
                        <div className="project-detail__status-line">Active Development</div>
                    )}
                    <p className="project-detail__summary">{project.summary}</p>
                    {project.technologies?.length > 0 && (
                        <div className="project-detail__tags">
                            {project.technologies.map((tech) => (
                                <span key={tech} className="project-detail__tag">{tech}</span>
                            ))}
                        </div>
                    )}
                    {project.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={project.image_url}
                            alt={project.title}
                            className="project-detail__screenshot"
                            loading="eager"
                        />
                    )}
                    <div className="project-detail__content">
                        <div className="prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.content) }} />
                    </div>
                </div>
                <aside className="project-detail__sidebar">
                    <div className="project-detail__sidebar-section">
                        <div className="project-detail__sidebar-label">Details</div>
                        <div className="project-detail__meta-table">
                            {project.is_featured && (
                                <div className="project-detail__meta-row">
                                    <span className="project-detail__meta-key">Status</span>
                                    <span className="project-detail__meta-val project-detail__meta-val--accent">Active</span>
                                </div>
                            )}
                            <div className="project-detail__meta-row">
                                <span className="project-detail__meta-key">Created</span>
                                <span className="project-detail__meta-val">{formatDateShort(project.createdDate)}</span>
                            </div>
                            {project.github_url && (
                                <div className="project-detail__meta-row">
                                    <span className="project-detail__meta-key">Repo</span>
                                    <a
                                        href={project.github_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="project-detail__meta-val project-detail__meta-val--link"
                                    >
                                        GitHub
                                    </a>
                                </div>
                            )}
                            {project.live_url && (
                                <div className="project-detail__meta-row">
                                    <span className="project-detail__meta-key">Demo</span>
                                    <a
                                        href={project.live_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="project-detail__meta-val project-detail__meta-val--link"
                                    >
                                        Live Demo
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </article>
    );
};
