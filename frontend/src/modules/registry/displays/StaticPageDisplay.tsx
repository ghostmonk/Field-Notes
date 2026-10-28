import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import type { StaticPageDisplayProps } from '../types';

export const StaticPageDisplay: React.FC<StaticPageDisplayProps> = ({ content, title }) => {
    return (
        <article className="static-page">
            {title && <h1 className="static-page__title">{title}</h1>}
            <div className="prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
        </article>
    );
};
