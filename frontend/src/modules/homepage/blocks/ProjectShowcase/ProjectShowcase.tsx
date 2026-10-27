import Link from 'next/link';
import type { HomepageBlockProps } from '../../types';
import { SectionHeader } from '../SectionHeader';

export function ProjectShowcase({ data }: HomepageBlockProps) {
    const { projects } = data;
    if (projects.length === 0) return null;

    return (
        <div data-testid="project-showcase-block">
            <SectionHeader label="Projects" annotation={`${projects.length} active`} />
            <div className="project-showcase">
                {projects.map((project) => (
                    <Link
                        key={project.id}
                        href={`/projects/${project.slug}`}
                        className="project-showcase__card"
                        data-testid={`project-card-${project.id}`}
                    >
                        <h3 className="project-showcase__title">{project.title}</h3>
                        <p className="project-showcase__summary">{project.summary}</p>
                        {project.technologies.length > 0 && (
                            <div className="project-showcase__tech">
                                {project.technologies.map((tech) => (
                                    <span key={tech} className="project-showcase__tag">{tech}</span>
                                ))}
                            </div>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
