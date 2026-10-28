import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProjectCard as ProjectCardType } from '@/shared/types/api';
import { AdminEditButton } from '@/components/AdminEditButton';
import { AdminDraftBadge } from '@/components/AdminDraftBadge';

interface ProjectCardProps {
    project: ProjectCardType;
    basePath?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, basePath }) => {
    const router = useRouter();

    return (
        <Link href={`${basePath || '/projects'}/${project.slug}`} className="project-card" data-testid="project-card">
            <div className="card__admin-actions card__admin-actions--overlay">
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
            <h5 className="project-card__title">{project.title}</h5>
            <p className="project-card__desc">{project.summary}</p>
            <div className="project-card__tech">
                {project.technologies?.join(' + ')}
                {project.is_featured && (
                    <span className="project-card__status">Active</span>
                )}
            </div>
        </Link>
    );
};
