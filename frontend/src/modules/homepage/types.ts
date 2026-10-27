import { ComponentType } from 'react';
import { Story, ProjectCard, PhotoEssayCard } from '@/shared/types/api';

export type HomepageBlockType =
    | 'identity-hero'
    | 'photo-strip'
    | 'featured-story'
    | 'recent-writing'
    | 'project-showcase'
    | 'contribution-summary';

export interface HomepageBlockConfig {
    type: HomepageBlockType;
    id: string;
    props?: Record<string, unknown>;
}

export interface HomepageData {
    stories: Story[];
    featuredStory: Story | null;
    projects: ProjectCard[];
    photoEssays: PhotoEssayCard[];
    sectionPathMap: Record<string, string>;
}

export interface HomepageBlockProps {
    data: HomepageData;
    config?: Record<string, unknown>;
}

export type HomepageBlockComponent = ComponentType<HomepageBlockProps>;
