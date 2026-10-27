import type { HomepageBlockType, HomepageBlockComponent } from './types';
import { IdentityHero } from './blocks/IdentityHero';
import { PhotoStrip } from './blocks/PhotoStrip';
import { FeaturedStory } from './blocks/FeaturedStory';
import { RecentWriting } from './blocks/RecentWriting';
import { ProjectShowcase } from './blocks/ProjectShowcase';
import { ContributionSummary } from './blocks/ContributionSummary';

export const blockRegistry: Record<HomepageBlockType, HomepageBlockComponent> = {
    'identity-hero': IdentityHero,
    'photo-strip': PhotoStrip,
    'featured-story': FeaturedStory,
    'recent-writing': RecentWriting,
    'project-showcase': ProjectShowcase,
    'contribution-graph': ContributionSummary,
};
