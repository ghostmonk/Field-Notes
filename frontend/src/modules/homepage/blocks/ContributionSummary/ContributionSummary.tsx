import { ContributionGraph } from '@/modules/projects';
import type { HomepageBlockProps } from '../../types';
import { SectionHeader } from '../SectionHeader';

export function ContributionSummary(_props: HomepageBlockProps) {
    return (
        <div data-testid="contribution-summary-block">
            <SectionHeader label="GitHub" annotation="this year" />
            <ContributionGraph />
        </div>
    );
}
