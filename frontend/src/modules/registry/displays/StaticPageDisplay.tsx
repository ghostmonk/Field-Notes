import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import type { StaticPageDisplayProps } from '../types';

export const StaticPageDisplay: React.FC<StaticPageDisplayProps> = ({ content, title }) => {
    return (
        <div className="page-container">
            {title && <h1 className="page-title">{title}</h1>}
            <div className="card">
                <div className="prose prose--card">
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
                </div>
            </div>
        </div>
    );
};
