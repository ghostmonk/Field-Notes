import { useState } from 'react';
import { saveAs } from 'file-saver';

interface PDFDownloadButtonProps {
  fallbackFilename?: string;
}

export function PDFDownloadButton({ fallbackFilename = 'Resume.pdf' }: PDFDownloadButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/resume/download-pdf');
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? fallbackFilename;
      const blob = await response.blob();
      saveAs(blob, filename);
    } catch {
      setError('PDF generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={generating}
        className="btn btn-primary text-sm flex items-center gap-1.5"
        title="Download PDF"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {generating ? 'Generating...' : 'PDF'}
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </>
  );
}
