import { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ResumeDocument } from '@/modules/resume/generators/pdf-document';
import { getResumeFilename } from '@/modules/resume/shared';
import { Resume } from '@/shared/types/api';
import { apiLogger } from '@/shared/utils/logger';
import { fetchBackend, sanitizeFilename } from '@/shared/utils/backend-fetch';

let cachedPdf: { buffer: Buffer; filename: string; expiresAt: number } | null = null;
let pendingRender: Promise<{ buffer: Buffer; filename: string }> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidatePdfCache() {
  cachedPdf = null;
}

function sendPdf(
  res: NextApiResponse,
  buffer: Buffer,
  filename: string,
  cacheStatus: string
) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Cache', cacheStatus);
  return res.send(buffer);
}

async function renderResumePdf(): Promise<{ buffer: Buffer; filename: string }> {
  const response = await fetchBackend('/resume/public');

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Backend returned ${response.status}`);
  }

  const resume: Resume = await response.json();

  const element = React.createElement(ResumeDocument, { resume });
  // react-pdf types require ReactElement<DocumentProps>; wrapper components need a cast
  const buffer = await renderToBuffer(
    element as unknown as Parameters<typeof renderToBuffer>[0]
  );

  const filename = sanitizeFilename(getResumeFilename(resume, 'pdf'));

  return { buffer: Buffer.from(buffer), filename };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    if (cachedPdf && Date.now() < cachedPdf.expiresAt) {
      return sendPdf(res, cachedPdf.buffer, cachedPdf.filename, 'HIT');
    }

    // Coalesce concurrent cold-cache requests into a single render
    if (!pendingRender) {
      pendingRender = renderResumePdf().finally(() => {
        pendingRender = null;
      });
    }

    const result = await pendingRender;

    cachedPdf = { ...result, expiresAt: Date.now() + CACHE_TTL_MS };

    return sendPdf(res, result.buffer, result.filename, 'MISS');
  } catch (error) {
    apiLogger.error(
      'PDF generation failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'PDF generation failed' });
  }
}
