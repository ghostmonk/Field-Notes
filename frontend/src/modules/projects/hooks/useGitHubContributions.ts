import { useEffect, useState } from 'react';

interface ContributionDay {
    date: string;
    contributionCount: number;
    contributionLevel: string;
}

interface ContributionWeek {
    contributionDays: ContributionDay[];
}

export interface ContributionData {
    totalContributions: number;
    weeks: ContributionWeek[];
}

let cached: ContributionData | null = null;
let pending: Promise<ContributionData> | null = null;

function fetchContributions(): Promise<ContributionData> {
    if (cached) return Promise.resolve(cached);
    if (pending) return pending;

    pending = fetch('/api/github/contributions')
        .then((res) => {
            if (!res.ok) throw new Error(`${res.status}`);
            return res.json();
        })
        .then((data: ContributionData) => {
            cached = data;
            pending = null;
            return data;
        })
        .catch((err) => {
            pending = null;
            throw err;
        });

    return pending;
}

export function useGitHubContributions() {
    const [data, setData] = useState<ContributionData | null>(cached);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (cached) {
            setData(cached);
            return;
        }

        let cancelled = false;
        fetchContributions()
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });

        return () => { cancelled = true; };
    }, []);

    return { data, error };
}
