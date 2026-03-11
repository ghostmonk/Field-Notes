import { FeedDisplay, CardGridDisplay, StaticPageDisplay, GalleryDisplay } from './displays';
import type { DisplayType } from './types';
import React from 'react';

export const displayRegistry: Record<DisplayType, React.ComponentType<any>> = {
    'feed': FeedDisplay,
    'card-grid': CardGridDisplay,
    'static-page': StaticPageDisplay,
    'gallery': GalleryDisplay,
};
