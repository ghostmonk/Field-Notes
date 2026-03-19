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

  const handleDocxDownload = async () => {
    setGeneratingDocx(true);
    try {
      const { generateDocx } = await import('../generators/docx-generator');
      await generateDocx(resume as Resume);
    } catch (err) {
      console.error('DOCX generation failed:', err);
    } finally {
      setGeneratingDocx(false);
    }
  };

  const hasData = resume.contact?.full_name;

  return (
    <div className="flex gap-3">
      {hasData && <PDFDownload resume={resume as Resume} />}
      <button
        type="button"
        onClick={handleDocxDownload}
        disabled={!hasData || generatingDocx}
        className="btn text-sm"
      >
        {generatingDocx ? 'Generating...' : 'Download DOCX'}
      </button>
    </div>
  );
}
