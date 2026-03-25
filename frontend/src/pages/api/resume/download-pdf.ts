import { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ResumeDocument } from '@/modules/resume/generators/pdf-document';
import { getResumeFilename } from '@/modules/resume/shared';
import { Resume } from '@/shared/types/api';
import { apiLogger } from '@/shared/utils/logger';
import { fetchBackend, sanitizeFilename } from '@/shared/utils/backend-fetch';

let cachedPdf: { buffer: Buffer; filename: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    // Check cache
    if (cachedPdf && Date.now() < cachedPdf.expiresAt) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cachedPdf.filename}"`,
      );
      res.setHeader('Content-Length', cachedPdf.buffer.length);
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cachedPdf.buffer);
    }

    const response = await fetchBackend('/resume/public');

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ detail: 'Failed to fetch resume' });
    }

    const resume: Resume = await response.json();

    // react-pdf types require ReactElement<DocumentProps>; wrapper components need a cast
    const element = React.createElement(ResumeDocument, { resume });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0]
    );

    const filename = sanitizeFilename(getResumeFilename(resume, 'pdf'));

    // Cache the rendered PDF
    cachedPdf = {
      buffer: Buffer.from(buffer),
      filename,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Cache', 'MISS');
    return res.send(buffer);
  } catch (error) {
    apiLogger.error(
      'PDF generation failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'PDF generation failed' });
  }
}
