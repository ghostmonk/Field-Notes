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

    // ResumeDocument renders a <Document> internally — the type mismatch
    // is because renderToBuffer expects ReactElement<DocumentProps> but
    // receives a wrapper component. Runtime behavior is correct.
    const element = React.createElement(ResumeDocument, { resume });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0]
    );

    const filename = getResumeFilename(resume, 'pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (error) {
    apiLogger.error(
      'PDF generation failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ detail: 'PDF generation failed' });
  }
}
