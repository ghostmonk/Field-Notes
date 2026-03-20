import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { Resume } from '@/shared/types/api';
import { DownloadButtons } from '@/modules/resume';

interface ResumePageProps {
  resume: Resume | null;
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
  const contactParts = [c.email, c.phone, c.location, c.website, c.linkedin, c.github].filter(Boolean);

  return (
    <>
      <Head>
        <title>{c.full_name ? `${c.full_name} - Resume` : 'Resume'}</title>
      </Head>
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            {c.full_name && (
              <h1 className="text-3xl font-bold">{c.full_name}</h1>
            )}
            {contactParts.length > 0 && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {contactParts.join('  |  ')}
              </p>
            )}
          </div>
          <DownloadButtons resume={resume} />
        </div>

        {resume.summary && (
          <div className="border-t border-[var(--color-border)] pt-6 mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
              Summary
            </h2>
            <p className="whitespace-pre-line">{resume.summary}</p>
          </div>
        )}

        {resume.work_experience.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-6 mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">
              Experience
            </h2>
            <div className="space-y-6">
              {resume.work_experience.map((w, i) => (
                <div key={i} className="pl-4 border-l-2 border-[var(--color-border)]">
                  {w.title && <div className="font-semibold">{w.title}</div>}
                  <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                    <span>{w.company}</span>
                    <span>
                      {w.start_date}
                      {w.current ? ' - Present' : w.end_date ? ` - ${w.end_date}` : ''}
                    </span>
                  </div>
                  {w.description && (
                    <p className="mt-2 text-sm whitespace-pre-line">{w.description}</p>
                  )}
                  {w.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.technologies.map((t, j) => (
                        <span
                          key={j}
                          className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {resume.education.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-6 mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">
              Education
            </h2>
            <div className="space-y-4">
              {resume.education.map((e, i) => (
                <div key={i} className="pl-4 border-l-2 border-[var(--color-border)]">
                  {e.degree && (
                    <div className="font-semibold">
                      {e.degree}
                      {e.field_of_study ? ` - ${e.field_of_study}` : ''}
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
                    <span>{e.institution}</span>
                    <span>
                      {e.start_date}
                      {e.end_date ? ` - ${e.end_date}` : ''}
                    </span>
                  </div>
                  {e.description && (
                    <p className="mt-1 text-sm">{e.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {resume.skills.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-6 mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-sm bg-[var(--color-surface)] border border-[var(--color-border)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
