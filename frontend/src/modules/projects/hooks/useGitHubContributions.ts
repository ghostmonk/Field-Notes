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
let pending: Promise<ContributionData | null> | null = null;

function fetchContributions(signal: AbortSignal): Promise<ContributionData | null> {
    if (cached) return Promise.resolve(cached);
    if (pending) return pending;

    pending = fetch('/api/github/contributions', { signal })
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
            if (err.name === 'AbortError') return null;
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

        const controller = new AbortController();
        fetchContributions(controller.signal)
            .then((result) => {
                if (result) setData(result);
            })
            .catch(() => setError(true));

        return () => controller.abort();
    }, []);

    return { data, error };
}
