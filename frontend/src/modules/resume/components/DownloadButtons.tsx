import { useState } from 'react';
import { Resume } from '@/shared/types/api';
import { HiOutlineDocumentDownload } from 'react-icons/hi';
import { PDFDownloadButton } from '../generators/pdf-generator';

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
    <div className="flex gap-2 items-center">
      {hasData && <PDFDownloadButton resume={resume as Resume} />}
      <button
        type="button"
        onClick={handleDocxDownload}
        disabled={!hasData || generatingDocx}
        className="btn text-sm flex items-center gap-1.5"
        title="Download DOCX"
      >
        <HiOutlineDocumentDownload className="w-4 h-4" />
        {generatingDocx ? 'Generating...' : 'DOCX'}
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
