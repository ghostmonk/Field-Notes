import { StoryCard } from '@/modules/stories';
import { StoryDetail } from '@/modules/stories';
import { ProjectCard, ProjectDetail } from '@/modules/projects';
import type { ContentType, ContentEntry } from './types';

export const contentRegistry: Record<ContentType, ContentEntry> = {
    story: {
        listItem: StoryCard,
        detail: StoryDetail,
    },
    project: {
        listItem: ProjectCard,
        detail: ProjectDetail,
    },
    page: {
        listItem: null,
        detail: null,
    },
};
