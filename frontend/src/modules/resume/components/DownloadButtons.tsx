import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Resume } from '@/shared/types/api';

const PDFDownload = dynamic(
  () =>
    import('../generators/pdf-generator').then((mod) => ({
      default: mod.PDFDownloadButton,
    })),
  { ssr: false }
);

interface DownloadButtonsProps {
  resume: Partial<Resume>;
}

export function DownloadButtons({ resume }: DownloadButtonsProps) {
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDocxDownload = async () => {
    setGeneratingDocx(true);
    setError(null);
    try {
      const { generateDocx } = await import('../generators/docx-generator');
      await generateDocx(resume as Resume);
    } catch {
      setError('DOCX generation failed');
    } finally {
      setGeneratingDocx(false);
    }
  };

  const hasData = resume.contact?.full_name;

  return (
    <div className="flex gap-3 items-center">
      {hasData && <PDFDownload resume={resume as Resume} />}
      <button
        type="button"
        onClick={handleDocxDownload}
        disabled={!hasData || generatingDocx}
        className="btn text-sm"
      >
        {generatingDocx ? 'Generating...' : 'Download DOCX'}
      </button>
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
}
