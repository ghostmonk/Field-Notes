import React from 'react';

export type DisplayType = 'feed' | 'card-grid' | 'static-page';
export type ContentType = 'story' | 'project' | 'page';

export interface ContentEntry {
    // Components stored as references; prop typing enforced at consumption site (Phase 4)
    listItem: React.ComponentType<any> | null;
    detail: React.ComponentType<any> | null;
}

export interface FeedDisplayProps<T = unknown> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    onLoadMore: () => void;
    hasMore: boolean;
    keyExtractor?: (item: T, index: number) => string;
}

export interface CardGridDisplayProps<T = unknown> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
}

export interface StaticPageDisplayProps {
    content: string;
    title?: string;
}
