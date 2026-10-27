import { useCallback, useRef } from 'react';
import { getSiteConfig } from '@/config';
import { useGitHubContributions, type ContributionData } from '../hooks/useGitHubContributions';

function useDragScroll() {
    const ref = useRef<HTMLDivElement>(null);
    const state = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const el = ref.current;
        if (!el) return;
        state.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
        el.style.cursor = 'grabbing';
    }, []);

    const onMouseUp = useCallback(() => {
        state.current.isDown = false;
        if (ref.current) ref.current.style.cursor = 'grab';
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!state.current.isDown || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        ref.current.scrollLeft = state.current.scrollLeft - (x - state.current.startX);
    }, []);

    return { ref, onMouseDown, onMouseUp, onMouseLeave: onMouseUp, onMouseMove };
}

const LEVEL_CLASS: Record<string, string> = {
    NONE: 'contrib-graph__cell--none',
    FIRST_QUARTILE: 'contrib-graph__cell--first',
    SECOND_QUARTILE: 'contrib-graph__cell--second',
    THIRD_QUARTILE: 'contrib-graph__cell--third',
    FOURTH_QUARTILE: 'contrib-graph__cell--fourth',
};

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getMonthLabels(weeks: ContributionData['weeks']) {
    const months: { label: string; col: number }[] = [];
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    let lastMonth = -1;

    for (let i = 0; i < weeks.length; i++) {
        const firstDay = weeks[i].contributionDays[0];
        if (!firstDay) continue;
        const d = new Date(firstDay.date + 'T00:00:00');
        const m = d.getMonth();
        if (m !== lastMonth) {
            months.push({ label: formatter.format(d), col: i });
            lastMonth = m;
        }
    }
    return months;
}

const github = getSiteConfig().github;

export function ContributionGraph() {
    const { data, error } = useGitHubContributions();

    const drag = useDragScroll();

    if (error || !github) return null;

    if (!data) {
        return (
            <div className="contrib-graph animate-pulse" data-testid="contribution-graph-skeleton">
                <div className="h-[86px] w-full bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        );
    }

    const monthLabels = getMonthLabels(data.weeks);

    return (
        <div className="contrib-graph" data-testid="contribution-graph">

            <div className="contrib-graph__grid-wrapper">
                <div className="contrib-graph__day-labels">
                    {DAY_LABELS.map((label, i) => (
                        <span key={i} className="contrib-graph__day-label">{label}</span>
                    ))}
                </div>

                <div
                    className="contrib-graph__grid-container"
                    ref={drag.ref}
                    onMouseDown={drag.onMouseDown}
                    onMouseUp={drag.onMouseUp}
                    onMouseLeave={drag.onMouseLeave}
                    onMouseMove={drag.onMouseMove}
                >
                    <div className="contrib-graph__month-labels">
                        {monthLabels.map(({ label, col }) => (
                            <span
                                key={`${label}-${col}`}
                                className="contrib-graph__month-label"
                                style={{ gridColumnStart: col + 1 }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    <div className="contrib-graph__grid">
                        {data.weeks.map((week, wi) => (
                            <div key={wi} className="contrib-graph__column">
                                {(week.contributionDays ?? []).map((day) => (
                                    <div
                                        key={day.date}
                                        className={`contrib-graph__cell ${LEVEL_CLASS[day.contributionLevel] || LEVEL_CLASS.NONE}`}
                                        title={`${day.contributionCount} contributions on ${day.date}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="contrib-graph__footer">
                <div className="contrib-graph__legend">
                    <span className="contrib-graph__legend-label">Less</span>
                    <div className="contrib-graph__cell contrib-graph__cell--none" />
                    <div className="contrib-graph__cell contrib-graph__cell--first" />
                    <div className="contrib-graph__cell contrib-graph__cell--second" />
                    <div className="contrib-graph__cell contrib-graph__cell--third" />
                    <div className="contrib-graph__cell contrib-graph__cell--fourth" />
                    <span className="contrib-graph__legend-label">More</span>
                </div>
            </div>
        </div>
    );
}
