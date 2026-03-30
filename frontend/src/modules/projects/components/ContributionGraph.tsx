import { useCallback, useEffect, useRef, useState } from 'react';
import { FaGithub } from 'react-icons/fa6';
import { getSiteConfig } from '@/config';

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

interface ContributionDay {
    date: string;
    contributionCount: number;
    contributionLevel: string;
}

interface ContributionWeek {
    contributionDays: ContributionDay[];
}

interface ContributionData {
    totalContributions: number;
    weeks: ContributionWeek[];
}

const LEVEL_CLASS: Record<string, string> = {
    NONE: 'contrib-graph__cell--none',
    FIRST_QUARTILE: 'contrib-graph__cell--first',
    SECOND_QUARTILE: 'contrib-graph__cell--second',
    THIRD_QUARTILE: 'contrib-graph__cell--third',
    FOURTH_QUARTILE: 'contrib-graph__cell--fourth',
};

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getMonthLabels(weeks: ContributionWeek[]) {
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
    const [data, setData] = useState<ContributionData | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/github/contributions', { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`${res.status}`);
                return res.json();
            })
            .then(setData)
            .catch((err) => {
                if (err.name !== 'AbortError') setError(true);
            });
        return () => controller.abort();
    }, []);

    const drag = useDragScroll();

    if (error || !github) return null;

    if (!data) {
        return (
            <div className="contrib-graph animate-pulse" data-testid="contribution-graph-skeleton">
                <div className="contrib-graph__header">
                    <div>
                        <div className="h-4 w-48 bg-gray-300 dark:bg-gray-600 rounded mb-2" />
                        <div className="h-3 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-[86px] w-full bg-gray-200 dark:bg-gray-700 rounded mt-2" />
                <div className="contrib-graph__footer">
                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        );
    }

    const monthLabels = getMonthLabels(data.weeks);

    return (
        <div
            className="contrib-graph"
            data-testid="contribution-graph"
        >
            <div className="contrib-graph__header">
                <span className="contrib-graph__total">
                    {data.totalContributions.toLocaleString()} contributions this year
                    <br />
                    <em className="contrib-graph__subtitle">Some of my contributions are no longer reportable through GitHub</em>
                </span>
                <a
                    href={github.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contrib-graph__profile"
                ><FaGithub />{github.username}</a>
            </div>

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
