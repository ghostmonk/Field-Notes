import { FeedDisplay, CardGridDisplay, StaticPageDisplay } from './displays';
import type { DisplayType } from './types';
import React from 'react';

export const displayRegistry: Record<DisplayType, React.ComponentType<any>> = {
    'feed': FeedDisplay,
    'card-grid': CardGridDisplay,
    'static-page': StaticPageDisplay,
};
