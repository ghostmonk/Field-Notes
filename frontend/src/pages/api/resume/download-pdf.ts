import { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ResumeDocument } from '@/modules/resume/generators/pdf-document';
import { getResumeFilename } from '@/modules/resume/shared';
import { Resume } from '@/shared/types/api';
import { apiLogger } from '@/shared/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const API_BASE_URL =
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!API_BASE_URL) {
    return res.status(500).json({ detail: 'Backend URL not configured' });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/resume/public`);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ detail: 'Failed to fetch resume' });
    }

    const resume: Resume = await response.json();

    // renderToBuffer expects ReactElement<DocumentProps> but ResumeDocument
    // is a wrapper whose props are {resume: Resume}, not DocumentProps.
    // All react-pdf render functions (renderToBuffer, renderToStream, pdf())
    // share this constraint. The cast is unavoidable without making
    // ResumeDocument extend DocumentProps, which would leak PDF internals
    // into the component's public API. Runtime behavior is correct because
    // react-pdf traverses the rendered tree to find the <Document> child.
    const element = React.createElement(ResumeDocument, { resume });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0]
    );

    const filename = getResumeFilename(resume, 'pdf').replace(
      /[^A-Za-z0-9._\-]/g,
      '_',
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.setHeader(
      'Cache-Control',
      'private, max-age=300, stale-while-revalidate=600',
    );
    return res.send(buffer);
  } catch (error) {
    apiLogger.error(
      'PDF generation failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'PDF generation failed' });
  }
}
