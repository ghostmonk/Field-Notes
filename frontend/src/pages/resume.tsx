import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { Resume } from '@/shared/types/api';
import { DownloadButtons } from '@/modules/resume';
import { parseDescription } from '@/modules/resume/shared';
import {
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlineCalendar,
} from 'react-icons/hi';
import { FaLinkedinIn, FaGithub } from 'react-icons/fa';

interface ResumePageProps {
  resume: Resume | null;
}

function renderDescription(text: string): React.ReactNode[] {
  const parts = parseDescription(text);
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-sm"
        >
          {bulletBuffer.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>,
      );
      bulletBuffer = [];
    }
  };

  for (const part of parts) {
    if (part.type === 'bullet') {
      bulletBuffer.push(part.text);
    } else {
      flushBullets();
      elements.push(
        <p key={`p-${elements.length}`} className="text-sm mt-1">
          {part.text}
        </p>,
      );
    }
  }
  flushBullets();
  return elements;
}

export const getServerSideProps: GetServerSideProps<ResumePageProps> = async () => {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) return { props: { resume: null } };

  try {
    const res = await fetch(`${backendUrl}/resume/public`);
    if (!res.ok) return { props: { resume: null } };
    const resume = await res.json();
    return { props: { resume } };
  } catch {
    return { props: { resume: null } };
  }
};

export default function ResumePage({ resume }: ResumePageProps) {
  if (!resume) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-[var(--color-text-secondary)]">
        No resume available.
      </div>
    );
  }

  const c = resume.contact;
  const sectionHeading =
    'text-base font-bold uppercase tracking-wider border-b-2 border-[var(--color-text-primary)] pb-1 mb-4';

  return (
    <>
      <Head>
        <title>{c.full_name ? `${c.full_name} - Resume` : 'Resume'}</title>
      </Head>
      <div className="max-w-5xl mx-auto">
        {/* Dark header */}
        <div className="resume-header bg-[#1b2838] text-white px-4 sm:px-8 py-6 rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              {c.full_name && (
                <h1 className="text-xl sm:text-2xl font-bold tracking-wide">{c.full_name}</h1>
              )}
              {c.title && (
                <p className="text-xs sm:text-sm text-gray-400 mt-1">{c.title}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-gray-300">
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <HiOutlinePhone className="w-3.5 h-3.5" />
                    {c.phone}
                  </span>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-white transition-colors">
                    <HiOutlineMail className="w-3.5 h-3.5" />
                    {c.email}
                  </a>
                )}
                {c.location && (
                  <span className="flex items-center gap-1">
                    <HiOutlineLocationMarker className="w-3.5 h-3.5" />
                    {c.location}
                  </span>
                )}
                {c.linkedin && (
                  <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                    <FaLinkedinIn className="w-3.5 h-3.5" />
                    LinkedIn
                  </a>
                )}
                {c.github && (
                  <a href={c.github.startsWith('http') ? c.github : `https://${c.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                    <FaGithub className="w-3.5 h-3.5" />
                    GitHub
                  </a>
                )}
                {c.website && (
                  <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                    {c.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
            <DownloadButtons resume={resume} />
          </div>
        </div>

        {/* Summary — full width above columns */}
        {resume.summary && (
          <div className="px-4 sm:px-8 pt-6">
            <h2 className={sectionHeading}>Summary</h2>
            <p className="text-sm whitespace-pre-line">{resume.summary}</p>
          </div>
        )}

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 px-4 sm:px-8 py-6">
          {/* Left column: Experience + Education */}
          <div className="space-y-8">
            {resume.work_experience.length > 0 && (
              <section>
                <h2 className={sectionHeading}>Experience</h2>
                <div className="space-y-5">
                  {resume.work_experience.map((w, i) => (
                    <div key={i}>
                      {w.title && (
                        <div className="font-bold text-[var(--color-text-primary)]">
                          {w.title}
                        </div>
                      )}
                      {w.company && (
                        <div className="font-bold text-[var(--color-text-primary)]">
                          {w.company_url ? (
                            <a href={w.company_url && w.company_url.startsWith('http') ? w.company_url : `https://${w.company_url}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-text-secondary)] transition-colors">
                              {w.company}
                            </a>
                          ) : (
                            w.company
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 text-xs text-[var(--color-text-secondary)] mt-0.5">
                        <span className="flex items-center gap-1">
                          <HiOutlineCalendar className="w-3 h-3" />
                          {w.start_date}
                          {w.current ? ' - Present' : w.end_date ? ` - ${w.end_date}` : ''}
                        </span>
                      </div>
                      {w.description && (
                        <div className="mt-1">{renderDescription(w.description)}</div>
                      )}
                      {w.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {w.technologies.map((t, j) => (
                            <span
                              key={j}
                              className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Right column: Skills + Achievements + Education */}
          <div className="space-y-8">
            {resume.skills.length > 0 && (
              <section>
                <h2 className={sectionHeading}>Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {resume.skills.map((s, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-primary)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {resume.achievements && resume.achievements.length > 0 && (
              <section>
                <h2 className={sectionHeading}>Achievements</h2>
                <ul className="space-y-2">
                  {resume.achievements.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-[var(--color-text-secondary)] shrink-0">&#9733;</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {resume.education.length > 0 && (
              <section>
                <h2 className={sectionHeading}>Education</h2>
                <div className="space-y-4">
                  {resume.education.map((e, i) => (
                    <div key={i}>
                      {e.degree && (
                        <div className="font-bold text-[var(--color-text-primary)]">
                          {e.degree}
                          {e.field_of_study ? ` - ${e.field_of_study}` : ''}
                        </div>
                      )}
                      {e.institution && (
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          {e.institution}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] mt-0.5">
                        <HiOutlineCalendar className="w-3 h-3" />
                        {e.start_date}
                        {e.end_date ? ` - ${e.end_date}` : ''}
                      </div>
                      {e.description && (
                        <p className="mt-1 text-sm">{e.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
