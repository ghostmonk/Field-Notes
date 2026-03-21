import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { apiClient } from '@/shared/lib/api-client';
import { TailorResult, FeedbackType } from '@/shared/types/api';

type PipelineStep = 'idle' | 'running' | 'done' | 'error';
type FeedbackState = 'idle' | 'submitting' | 'submitted' | 'error';

export default function AdminTailorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<TailorResult | null>(null);
  const [step, setStep] = useState<PipelineStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [flagNote, setFlagNote] = useState('');

  useEffect(() => {
    if (status !== 'loading' && (!session || session.user?.role !== 'admin')) {
      router.replace('/');
    }
  }, [status, session, router]);

  if (status === 'loading' || !session || session.user?.role !== 'admin') {
    return null;
  }

  const handleSubmit = async () => {
    if (!jobDescription.trim() || !session.accessToken) return;

    setStep('running');
    setError(null);
    setResult(null);
    setFeedbackState('idle');
    setFlagNote('');

    try {
      const data = await apiClient.tailor.run(
        { job_description: jobDescription },
        session.accessToken
      );
      setResult(data);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tailoring failed');
      setStep('error');
    }
  };

  return (
    <>
      <Head>
        <title>Resume Tailor</title>
      </Head>
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Resume Tailor</h1>

        <div className="mb-6">
          <label
            htmlFor="job-description"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Paste job description
          </label>
          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
            className="w-full rounded-md p-3 font-mono text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
            placeholder="Paste the full job description here..."
            disabled={step === 'running'}
          />
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={handleSubmit}
              disabled={!jobDescription.trim() || step === 'running'}
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{
                backgroundColor:
                  step === 'running'
                    ? 'var(--color-bg-tertiary)'
                    : 'var(--color-accent)',
                color: 'var(--color-bg-primary)',
                opacity: !jobDescription.trim() || step === 'running' ? 0.5 : 1,
                cursor:
                  !jobDescription.trim() || step === 'running'
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {step === 'running' ? 'Tailoring...' : 'Tailor Resume'}
            </button>
            {step === 'running' && (
              <span
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                This takes 15-30 seconds
              </span>
            )}
          </div>
        </div>

        {error && (
          <div
            className="rounded-md p-4 mb-6"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <ScoreCard evaluation={result.evaluation} attempts={result.attempts} />
            <FeedbackBar
              result={result}
              token={session.accessToken!}
              feedbackState={feedbackState}
              setFeedbackState={setFeedbackState}
              flagNote={flagNote}
              setFlagNote={setFlagNote}
            />
            <AnalysisCard analysis={result.analysis} />
            <ResumePreview resume={result.tailored_resume} />
          </div>
        )}
      </div>
    </>
  );
}

function ScoreCard({
  evaluation,
  attempts,
}: {
  evaluation: TailorResult['evaluation'];
  attempts: number;
}) {
  const scores = [
    { label: 'Overall', value: evaluation.overall },
    { label: 'Keywords', value: evaluation.keyword_coverage },
    { label: 'Relevance', value: evaluation.relevance_ranking },
    { label: 'ATS', value: evaluation.ats_compatibility },
  ];

  return (
    <div
      className="rounded-md p-4"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Evaluation</h2>
        <span
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {attempts} attempt{attempts > 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {scores.map((s) => (
          <div key={s.label} className="text-center">
            <div
              className="text-2xl font-bold"
              style={{
                color:
                  s.value >= 0.8
                    ? '#22c55e'
                    : s.value >= 0.6
                      ? '#eab308'
                      : '#ef4444',
              }}
            >
              {Math.round(s.value * 100)}
            </div>
            <div
              className="text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
      {evaluation.issues.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div
            className="text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Issues
          </div>
          <ul className="text-sm space-y-1">
            {evaluation.issues.map((issue, i) => (
              <li key={i} style={{ color: '#eab308' }}>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: TailorResult['analysis'] }) {
  return (
    <div
      className="rounded-md p-4"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h2 className="text-lg font-semibold mb-3">Job Analysis</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span style={{ color: 'var(--color-text-secondary)' }}>Seniority:</span>{' '}
          {analysis.seniority}
        </div>
        <div>
          <span style={{ color: 'var(--color-text-secondary)' }}>Domain:</span>{' '}
          {analysis.domain}
        </div>
        <div>
          <span style={{ color: 'var(--color-text-secondary)' }}>Culture:</span>{' '}
          {analysis.culture_signals}
        </div>
        <div>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Required:
          </span>{' '}
          {analysis.required_skills.join(', ')}
        </div>
        {analysis.preferred_skills.length > 0 && (
          <div className="col-span-2">
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Preferred:
            </span>{' '}
            {analysis.preferred_skills.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}

function ResumePreview({
  resume,
}: {
  resume: TailorResult['tailored_resume'];
}) {
  return (
    <div
      className="rounded-md p-6"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h2 className="text-lg font-semibold mb-4">Tailored Resume</h2>

      {resume.summary && (
        <div className="mb-4">
          <h3
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Summary
          </h3>
          <p className="text-sm">{resume.summary}</p>
        </div>
      )}

      {resume.work_experience && resume.work_experience.length > 0 && (
        <div className="mb-4">
          <h3
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Experience
          </h3>
          <div className="space-y-3">
            {resume.work_experience.map((job, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {job.title} — {job.company}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {job.start_date} - {job.current ? 'Present' : job.end_date}
                  </span>
                </div>
                {job.description && (
                  <div
                    className="text-sm mt-1 whitespace-pre-line"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {job.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {resume.skills && resume.skills.length > 0 && (
        <div className="mb-4">
          <h3
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Skills
          </h3>
          <p className="text-sm">{resume.skills.join(', ')}</p>
        </div>
      )}

      {resume.education && resume.education.length > 0 && (
        <div>
          <h3
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Education
          </h3>
          {resume.education.map((edu, i) => (
            <div key={i} className="text-sm">
              {edu.degree}
              {edu.field_of_study ? ` in ${edu.field_of_study}` : ''} —{' '}
              {edu.institution}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackBar({
  result,
  token,
  feedbackState,
  setFeedbackState,
  flagNote,
  setFlagNote,
}: {
  result: TailorResult;
  token: string;
  feedbackState: FeedbackState;
  setFeedbackState: (s: FeedbackState) => void;
  flagNote: string;
  setFlagNote: (s: string) => void;
}) {
  const [showFlagInput, setShowFlagInput] = useState(false);

  const jobContext = `${result.analysis.seniority}_${result.analysis.domain}`;

  const resumeToText = (r: TailorResult['tailored_resume']): string => {
    const parts: string[] = [];
    if (r.summary) parts.push(r.summary);
    r.work_experience?.forEach((job) => {
      parts.push(`${job.title} at ${job.company}`);
      if (job.description) parts.push(job.description);
    });
    if (r.skills?.length) parts.push(`Skills: ${r.skills.join(', ')}`);
    return parts.join('\n\n');
  };

  const submitFeedback = async (type: FeedbackType, note?: string) => {
    setFeedbackState('submitting');
    try {
      await apiClient.voiceFeedback.submit(
        {
          original_text: resumeToText(result.tailored_resume),
          feedback_type: type,
          job_context: jobContext,
          note: note || undefined,
        },
        token
      );
      setFeedbackState('submitted');
      setShowFlagInput(false);
    } catch {
      setFeedbackState('error');
    }
  };

  if (feedbackState === 'submitted') {
    return (
      <div
        className="rounded-md p-3 text-center text-sm"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#22c55e',
        }}
      >
        Feedback recorded
      </div>
    );
  }

  return (
    <div
      className="rounded-md p-4"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Rate this output:
        </span>
        <button
          onClick={() => submitFeedback('approved')}
          disabled={feedbackState === 'submitting'}
          className="px-3 py-1 rounded text-sm"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          Approve
        </button>
        <button
          onClick={() => submitFeedback('rejected')}
          disabled={feedbackState === 'submitting'}
          className="px-3 py-1 rounded text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          Reject
        </button>
        <button
          onClick={() => setShowFlagInput(!showFlagInput)}
          disabled={feedbackState === 'submitting'}
          className="px-3 py-1 rounded text-sm"
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            color: '#eab308',
            border: '1px solid rgba(234, 179, 8, 0.3)',
          }}
        >
          Flag
        </button>
        {feedbackState === 'error' && (
          <span className="text-sm" style={{ color: '#ef4444' }}>
            Failed to submit
          </span>
        )}
      </div>
      {showFlagInput && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            placeholder="What's wrong with this output?"
            className="flex-1 rounded px-3 py-1 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          />
          <button
            onClick={() => submitFeedback('flagged', flagNote)}
            disabled={!flagNote.trim() || feedbackState === 'submitting'}
            className="px-3 py-1 rounded text-sm"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg-primary)',
              opacity: !flagNote.trim() ? 0.5 : 1,
            }}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
