import { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa6';
import { getSiteConfig } from '@/config';
import { useGitHubContributions } from '../hooks/useGitHubContributions';

interface LanguageData {
    name: string;
    color: string;
    percentage: number;
}

interface ContributionStats {
    totalContributions: number;
    currentStreak: number;
    longestStreak: number;
}

const LANGUAGE_COLORS: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#a8d08d',
    Rust: '#dea584',
    Go: '#00add8',
    CSS: '#563d7c',
    HTML: '#e34c26',
    Shell: '#89e051',
    MDX: '#fcb32c',
    Markdown: '#083fa1',
    SCSS: '#c6538c',
    Lua: '#000080',
    Ruby: '#701516',
    Java: '#b07219',
    'C++': '#f34b7d',
    'C#': '#178600',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
};

function resolveColor(lang: LanguageData): string {
    return LANGUAGE_COLORS[lang.name] || lang.color || '#888';
}

function computeStreak(weeks: { contributionDays: { contributionCount: number }[] }[]): { current: number; longest: number } {
    const days = weeks.flatMap(w => w.contributionDays);
    let longest = 0;
    let streak = 0;
    let current = 0;

    for (const day of days) {
        if (day.contributionCount > 0) {
            streak++;
            if (streak > longest) longest = streak;
        } else {
            streak = 0;
        }
    }

    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].contributionCount > 0) current++;
        else break;
    }

    return { current, longest };
}

const github = getSiteConfig().github;

export function LanguageBreakdown() {
    const [languages, setLanguages] = useState<LanguageData[]>([]);
    const [stats, setStats] = useState<ContributionStats | null>(null);
    const { data: contributionData } = useGitHubContributions();

    useEffect(() => {
        if (contributionData) {
            const s = computeStreak(contributionData.weeks);
            setStats({
                totalContributions: contributionData.totalContributions,
                currentStreak: s.current,
                longestStreak: s.longest,
            });
        }
    }, [contributionData]);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/github/languages', { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`${res.status}`);
                return res.json();
            })
            .then(setLanguages)
            .catch(() => {});

        return () => controller.abort();
    }, []);

    if (!github) return null;

    return (
        <div className="lang-breakdown" data-testid="language-breakdown">
            {stats && (
                <div className="lang-breakdown__stats">
                    <span className="lang-breakdown__meta">Contributions <strong>{stats.totalContributions.toLocaleString()}</strong></span>
                    <span className="lang-breakdown__meta">Streak <strong>{stats.currentStreak}d</strong></span>
                    <span className="lang-breakdown__meta">Longest <strong>{stats.longestStreak}d</strong></span>
                </div>
            )}

            {languages.length > 0 && (
                <>
                    <div className="lang-breakdown__bar">
                        {languages.map((lang) => (
                            <div
                                key={lang.name}
                                className="lang-breakdown__segment"
                                style={{ width: `${lang.percentage}%`, backgroundColor: resolveColor(lang) }}
                                title={`${lang.name} ${lang.percentage}%`}
                            />
                        ))}
                    </div>
                    <div className="lang-breakdown__list">
                        {languages.slice(0, 6).map((lang) => (
                            <span key={lang.name} className="lang-breakdown__item">
                                <span className="lang-breakdown__dot" style={{ backgroundColor: resolveColor(lang) }} />
                                {lang.name} <span className="lang-breakdown__pct">{lang.percentage}%</span>
                            </span>
                        ))}
                    </div>
                </>
            )}

            <a
                href={github.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lang-breakdown__profile"
            ><FaGithub />{github.username}</a>
        </div>
    );
}
