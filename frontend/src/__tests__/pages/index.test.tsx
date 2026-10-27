import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/config', () => ({
    getSiteConfig: () => ({
        site: { title: 'Test Site', tagline: 'A test', author: 'Tester', copyright: '' },
        template: { active: 'ghostmonk' },
        hero: { showOnHome: true },
        fonts: { heading: 'sans', body: 'sans' },
        footer: { links: [] },
        homepage: {
            blocks: [
                { type: 'identity-hero', id: 'hero' },
                { type: 'featured-story', id: 'featured' },
                { type: 'recent-writing', id: 'writing' },
                { type: 'project-showcase', id: 'projects' },
                { type: 'photo-strip', id: 'photos' },
            ],
        },
    }),
}));

vi.mock('@/modules/homepage', () => ({
    Homepage: () => null,
}));

import { getStaticProps } from '@/pages/index';

function makeStory(id: string, title: string, published = true) {
    return {
        id,
        title,
        content: 'some words',
        is_published: published,
        slug: id,
        date: '2026-01-01',
        createdDate: '2026-01-01',
        updatedDate: '2026-01-01',
        tags: [],
    };
}

function makeProject(id: string, published = true) {
    return {
        id,
        title: `Project ${id}`,
        slug: id,
        summary: 'A project',
        technologies: [],
        image_url: null,
        github_url: null,
        live_url: null,
        is_featured: false,
        is_published: published,
        createdDate: '2026-01-01',
        updatedDate: '2026-01-01',
    };
}

function makePhotoEssay(id: string, published = true) {
    return {
        id,
        title: `Essay ${id}`,
        slug: id,
        cover_image_url: '/img.jpg',
        is_published: published,
        photo_count: 5,
        createdDate: '2026-01-01',
        updatedDate: '2026-01-01',
    };
}

const mockStories = [
    makeStory('s1', 'First Story'),
    makeStory('s2', 'Second Story'),
    makeStory('s3', 'Third Story'),
];

const mockProjects = [
    makeProject('p1', true),
    makeProject('p2', false),
    makeProject('p3', true),
];

const mockPhotoEssays = [
    makePhotoEssay('pe1', true),
    makePhotoEssay('pe2', false),
];

const mockSections = [
    { id: 'sec1', path: 'blog', slug: 'blog' },
    { id: 'sec2', path: '', slug: 'projects' },
];

function mockFetchResponses() {
    return vi.fn().mockImplementation((url: string) => {
        if (url.includes('/stories')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ items: mockStories, total: 3, limit: 6, offset: 0 }),
            });
        }
        if (url.includes('/projects')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ items: mockProjects, total: 3, limit: 6, offset: 0 }),
            });
        }
        if (url.includes('/photo-essays')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ items: mockPhotoEssays, total: 2, limit: 5, offset: 0 }),
            });
        }
        if (url.includes('/sections')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ items: mockSections, total: 2, limit: 100, offset: 0 }),
            });
        }
        return Promise.resolve({ ok: false });
    });
}

let savedBackendUrl: string | undefined;

beforeEach(() => {
    savedBackendUrl = process.env.BACKEND_URL;
    process.env.BACKEND_URL = 'http://localhost:5001';
    global.fetch = mockFetchResponses();
});

afterEach(() => {
    if (savedBackendUrl !== undefined) {
        process.env.BACKEND_URL = savedBackendUrl;
    } else {
        delete process.env.BACKEND_URL;
    }
    vi.restoreAllMocks();
});

describe('getStaticProps', () => {
    it('returns error when BACKEND_URL not set', async () => {
        delete process.env.BACKEND_URL;
        delete process.env.NEXT_PUBLIC_API_URL;
        const result = await getStaticProps({} as any);
        expect(result).toHaveProperty('props.error', 'Backend URL not configured');
        expect(result).toHaveProperty('revalidate', 60);
    });

    it('returns revalidate 300 on success', async () => {
        const result = await getStaticProps({} as any);
        expect(result).toHaveProperty('revalidate', 300);
    });

    it('featured story is first in list', async () => {
        const result = await getStaticProps({} as any);
        const props = (result as any).props;
        expect(props.data.featuredStory).not.toBeNull();
        expect(props.data.featuredStory.id).toBe('s1');
    });

    it('recent stories exclude the featured story', async () => {
        const result = await getStaticProps({} as any);
        const props = (result as any).props;
        const recentIds = props.data.stories.map((s: any) => s.id);
        expect(recentIds).not.toContain('s1');
        expect(recentIds).toContain('s2');
        expect(recentIds).toContain('s3');
    });

    it('projects filtered by is_published', async () => {
        const result = await getStaticProps({} as any);
        const props = (result as any).props;
        const projectIds = props.data.projects.map((p: any) => p.id);
        expect(projectIds).toContain('p1');
        expect(projectIds).toContain('p3');
        expect(projectIds).not.toContain('p2');
    });

    it('photoEssays filtered by is_published', async () => {
        const result = await getStaticProps({} as any);
        const props = (result as any).props;
        const essayIds = props.data.photoEssays.map((pe: any) => pe.id);
        expect(essayIds).toContain('pe1');
        expect(essayIds).not.toContain('pe2');
    });

    it('builds sectionPathMap from sections endpoint', async () => {
        const result = await getStaticProps({} as any);
        const props = (result as any).props;
        expect(props.data.sectionPathMap).toEqual({
            sec1: 'blog',
            sec2: 'projects',
        });
    });

    it('fetches stories only when needed blocks are configured', async () => {
        await getStaticProps({} as any);
        const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
        expect(calls.some((u: string) => u.includes('/stories'))).toBe(true);
        expect(calls.some((u: string) => u.includes('/projects'))).toBe(true);
        expect(calls.some((u: string) => u.includes('/photo-essays'))).toBe(true);
    });

    it('handles empty stories gracefully', async () => {
        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/stories')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ items: [], total: 0, limit: 6, offset: 0 }),
                });
            }
            if (url.includes('/sections')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ items: [], total: 0, limit: 6, offset: 0 }),
            });
        });

        const result = await getStaticProps({} as any);
        const props = (result as any).props;
        expect(props.data.featuredStory).toBeNull();
        expect(props.data.stories).toEqual([]);
    });

    it('limits recent stories to 5', async () => {
        const manyStories = Array.from({ length: 8 }, (_, i) => makeStory(`s${i}`, `Story ${i}`));
        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/stories')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ items: manyStories, total: 8, limit: 6, offset: 0 }),
                });
            }
            if (url.includes('/sections')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ items: [], total: 0, limit: 6, offset: 0 }),
            });
        });

        const result = await getStaticProps({} as any);
        const props = (result as any).props;
        expect(props.data.stories.length).toBeLessThanOrEqual(5);
    });

    it('paginates section fetching', async () => {
        const page1 = Array.from({ length: 100 }, (_, i) => ({
            id: `sec${i}`,
            path: `path${i}`,
            slug: `slug${i}`,
        }));
        const page2 = [{ id: 'sec100', path: 'extra', slug: 'extra' }];

        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/sections') && url.includes('offset=0')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ items: page1, total: 101, limit: 100, offset: 0 }),
                });
            }
            if (url.includes('/sections') && url.includes('offset=100')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ items: page2, total: 101, limit: 100, offset: 100 }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ items: [], total: 0, limit: 6, offset: 0 }),
            });
        });

        const result = await getStaticProps({} as any);
        const props = (result as any).props;
        expect(props.data.sectionPathMap['sec100']).toBe('extra');
        expect(Object.keys(props.data.sectionPathMap).length).toBe(101);
    });
});
