import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/shared/lib/api-client";
import { DownloadButtons } from "@/modules/resume";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button, Input, Textarea, Select, Tabs } from "@/components/ui";
import {
  TailorResult,
  FeedbackType,
  JobApplicationResponse,
  ApplicationStatus,
  UpdateResumeRequest,
  VoiceFeedbackResponse,
} from "@/shared/types/api";

type PipelineStep = "idle" | "running" | "done" | "error";
type FeedbackState = "idle" | "submitting" | "submitted" | "error";
type Tab = "tailor" | "applications" | "voice";
type SaveState = "idle" | "saving" | "saved" | "error";

interface ResumeTailorPanelProps {
  token: string;
}

export function ResumeTailorPanel({ token }: ResumeTailorPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tailor");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [step, setStep] = useState<PipelineStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [flagNote, setFlagNote] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveCompany, setSaveCompany] = useState("");
  const [saveTitle, setSaveTitle] = useState("");

  const handleSubmit = async () => {
    if (!jobDescription.trim() || !token) return;

    setStep("running");
    setError(null);
    setResult(null);
    setFeedbackState("idle");
    setFlagNote("");
    setSaveState("idle");
    setSaveCompany("");
    setSaveTitle("");

    try {
      const data = await apiClient.tailor.run(
        { job_description: jobDescription },
        token
      );
      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tailoring failed");
      setStep("error");
    }
  };

  const handleSaveApplication = async () => {
    if (!result || !token || !saveCompany.trim() || !saveTitle.trim()) return;
    setSaveState("saving");
    try {
      await apiClient.applications.create(
        {
          company: saveCompany.trim(),
          job_title: saveTitle.trim(),
          job_description: jobDescription,
          tailored_resume: result.tailored_resume,
          evaluation_score: result.evaluation,
          usage: result.usage,
        },
        token
      );
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <Tabs
      activeTab={activeTab}
      onTabChange={(v) => setActiveTab(v as Tab)}
      className="mb-6"
    >
      <Tabs.List>
        <Tabs.Tab value="tailor">tailor</Tabs.Tab>
        <Tabs.Tab value="applications">applications</Tabs.Tab>
        <Tabs.Tab value="voice">voice</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="applications">
        <ApplicationsTab token={token} />
      </Tabs.Panel>

      <Tabs.Panel value="voice">
        <VoiceTab token={token} />
      </Tabs.Panel>

      <Tabs.Panel value="tailor">
        <div className="mb-6">
          <label
            htmlFor="job-description"
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Paste job description
          </label>
          <Textarea
            id="job-description"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
            className="w-full font-mono text-sm"
            placeholder="Paste the full job description here..."
            disabled={step === "running"}
          />
          <div className="flex items-center gap-4 mt-3">
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!jobDescription.trim() || step === "running"}
              loading={step === "running"}
            >
              {step === "running" ? "Tailoring..." : "Tailor Resume"}
            </Button>
            {step === "running" && (
              <span
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                This takes 15-30 seconds
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="error-state rounded-md p-4 mb-6">{error}</div>
        )}

        {result && (
          <div className="space-y-6">
            <ScoreCard
              evaluation={result.evaluation}
              attempts={result.attempts}
              usage={result.usage}
            />
            <div className="flex gap-3">
              <FeedbackBar
                result={result}
                token={token}
                feedbackState={feedbackState}
                setFeedbackState={setFeedbackState}
                flagNote={flagNote}
                setFlagNote={setFlagNote}
              />
              <div className="flex items-center gap-2 self-start">
                <Input
                  type="text"
                  value={saveCompany}
                  onChange={(e) => setSaveCompany(e.target.value)}
                  placeholder="Company"
                  className="text-sm w-32"
                />
                <Input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Job title"
                  className="text-sm w-40"
                />
                <Button
                  variant={saveState === "saved" ? "ghost" : "primary"}
                  size="sm"
                  onClick={handleSaveApplication}
                  disabled={
                    saveState === "saving" ||
                    saveState === "saved" ||
                    !saveCompany.trim() ||
                    !saveTitle.trim()
                  }
                  loading={saveState === "saving"}
                >
                  {saveState === "saved"
                    ? "Saved"
                    : saveState === "saving"
                      ? "Saving..."
                      : "Save"}
                </Button>
              </div>
            </div>
            <div
              className="flex items-center gap-3 rounded-md p-3"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              <DownloadButtons resume={result.tailored_resume} />
              <SetAsDefaultButton
                tailoredResume={result.tailored_resume}
                token={token}
              />
            </div>
            <AnalysisCard analysis={result.analysis} />
            <ResumePreview resume={result.tailored_resume} />
          </div>
        )}
      </Tabs.Panel>
    </Tabs>
  );
}

function ScoreCard({
  evaluation,
  attempts,
  usage,
}: {
  evaluation: TailorResult["evaluation"];
  attempts: number;
  usage?: TailorResult["usage"];
}) {
  const scores = [
    { label: "Overall", value: evaluation.overall },
    { label: "Keywords", value: evaluation.keyword_coverage },
    { label: "Relevance", value: evaluation.relevance_ranking },
    { label: "ATS", value: evaluation.ats_compatibility },
  ];

  return (
    <div
      className="rounded-md p-4"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Evaluation</h2>
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {attempts} attempt{attempts > 1 ? "s" : ""}
          {usage && ` \u00b7 $${usage.total_cost_usd.toFixed(4)}`}
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
                    ? "#22c55e"
                    : s.value >= 0.6
                      ? "#eab308"
                      : "#ef4444",
              }}
            >
              {Math.round(s.value * 100)}
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
      {evaluation.issues.length > 0 && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div
            className="text-xs font-medium mb-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Issues
          </div>
          <ul className="text-sm space-y-1">
            {evaluation.issues.map((issue, i) => (
              <li key={i} style={{ color: "#eab308" }}>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: TailorResult["analysis"] }) {
  return (
    <div
      className="rounded-md p-4"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <h2 className="text-lg font-semibold mb-3">Job Analysis</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span style={{ color: "var(--color-text-secondary)" }}>
            Seniority:
          </span>{" "}
          {analysis.seniority}
        </div>
        <div>
          <span style={{ color: "var(--color-text-secondary)" }}>Domain:</span>{" "}
          {analysis.domain}
        </div>
        <div>
          <span style={{ color: "var(--color-text-secondary)" }}>
            Culture:
          </span>{" "}
          {analysis.culture_signals}
        </div>
        <div>
          <span style={{ color: "var(--color-text-secondary)" }}>
            Required:
          </span>{" "}
          {analysis.required_skills.join(", ")}
        </div>
        {analysis.preferred_skills.length > 0 && (
          <div className="col-span-2">
            <span style={{ color: "var(--color-text-secondary)" }}>
              Preferred:
            </span>{" "}
            {analysis.preferred_skills.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

function ResumePreview({
  resume,
}: {
  resume: TailorResult["tailored_resume"];
}) {
  return (
    <div
      className="rounded-md p-6"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <h2 className="text-lg font-semibold mb-4">Tailored Resume</h2>

      {resume.summary && (
        <div className="mb-4">
          <h3
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-secondary)" }}
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
            style={{ color: "var(--color-text-secondary)" }}
          >
            Experience
          </h3>
          <div className="space-y-3">
            {resume.work_experience.map((job, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {job.title} &mdash; {job.company}
                  </span>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    {job.start_date} - {job.current ? "Present" : job.end_date}
                  </span>
                </div>
                {job.description && (
                  <div
                    className="text-sm mt-1 whitespace-pre-line"
                    style={{ color: "var(--color-text-secondary)" }}
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
            style={{ color: "var(--color-text-secondary)" }}
          >
            Skills
          </h3>
          <p className="text-sm">{resume.skills.join(", ")}</p>
        </div>
      )}

      {resume.education && resume.education.length > 0 && (
        <div>
          <h3
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Education
          </h3>
          {resume.education.map((edu, i) => (
            <div key={i} className="text-sm">
              {edu.degree}
              {edu.field_of_study ? ` in ${edu.field_of_study}` : ""} &mdash;{" "}
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

  const resumeToText = (r: TailorResult["tailored_resume"]): string => {
    const parts: string[] = [];
    if (r.summary) parts.push(r.summary);
    r.work_experience?.forEach((job) => {
      parts.push(`${job.title} at ${job.company}`);
      if (job.description) parts.push(job.description);
    });
    if (r.skills?.length) parts.push(`Skills: ${r.skills.join(", ")}`);
    return parts.join("\n\n");
  };

  const submitFeedback = async (type: FeedbackType, note?: string) => {
    setFeedbackState("submitting");
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
      setFeedbackState("submitted");
      setShowFlagInput(false);
    } catch {
      setFeedbackState("error");
    }
  };

  if (feedbackState === "submitted") {
    return (
      <div
        className="rounded-md p-3 text-center text-sm"
        style={{
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          color: "#22c55e",
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
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Rate this output:
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => submitFeedback("approved")}
          disabled={feedbackState === "submitting"}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => submitFeedback("rejected")}
          disabled={feedbackState === "submitting"}
        >
          Reject
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFlagInput(!showFlagInput)}
          disabled={feedbackState === "submitting"}
        >
          Flag
        </Button>
        {feedbackState === "error" && (
          <span className="text-sm" style={{ color: "#ef4444" }}>
            Failed to submit
          </span>
        )}
      </div>
      {showFlagInput && (
        <div className="mt-3 flex gap-2">
          <Input
            type="text"
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            placeholder="What's wrong with this output?"
            className="flex-1 text-sm"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => submitFeedback("flagged", flagNote)}
            disabled={!flagNote.trim() || feedbackState === "submitting"}
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  saved: "#6b7280",
  applied: "#3b82f6",
  interviewing: "#eab308",
  offered: "#22c55e",
  rejected: "#ef4444",
};

function ApplicationsTab({ token }: { token: string }) {
  const [apps, setApps] = useState<JobApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const confirm = useConfirm();

  const loadApps = useCallback(async () => {
    try {
      const data = await apiClient.applications.list(token);
      setApps(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const handleStatusChange = async (
    id: string,
    status: ApplicationStatus
  ) => {
    try {
      const updated = await apiClient.applications.update(
        id,
        { status },
        token
      );
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Application",
      message: "Delete this saved application? This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await apiClient.applications.delete(id, token);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div
        className="text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Loading applications...
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div
        className="text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        No applications saved yet. Tailor a resume and click &quot;Save
        Application&quot;.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="applications-list">
      {apps.map((app) => (
        <div
          key={app.id}
          className="rounded-md p-4"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium">{app.job_title}</span>
              <span
                className="mx-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                at
              </span>
              <span className="font-medium">{app.company}</span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={app.status}
                onChange={(e) =>
                  handleStatusChange(
                    app.id,
                    e.target.value as ApplicationStatus
                  )
                }
                className="text-xs"
                style={{
                  color: STATUS_COLORS[app.status],
                }}
              >
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(app.id)}
              >
                Delete
              </Button>
            </div>
          </div>
          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span>
              Score: {Math.round(app.evaluation_score.overall * 100)}
            </span>
            <span>{new Date(app.created_at).toLocaleDateString()}</span>
            {app.job_url && (
              <a
                href={app.job_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-accent)" }}
              >
                Job listing
              </a>
            )}
            <button
              onClick={() =>
                setExpandedId(expandedId === app.id ? null : app.id)
              }
              style={{ color: "var(--color-accent)" }}
            >
              {expandedId === app.id ? "Hide" : "View"}
            </button>
          </div>
          {expandedId === app.id && (
            <ApplicationDetail app={app} token={token} />
          )}
        </div>
      ))}
    </div>
  );
}

function ApplicationDetail({
  app,
  token,
}: {
  app: JobApplicationResponse;
  token: string;
}) {
  return (
    <div
      className="mt-3 pt-3 space-y-3"
      style={{ borderTop: "1px solid var(--color-border)" }}
    >
      <ScoreCard
        evaluation={app.evaluation_score}
        attempts={1}
        usage={app.usage}
      />
      <div
        className="flex items-center gap-3 rounded-md p-3"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <DownloadButtons resume={app.tailored_resume} />
        <SetAsDefaultButton tailoredResume={app.tailored_resume} token={token} />
      </div>
      <ResumePreview resume={app.tailored_resume} />
    </div>
  );
}

function SetAsDefaultButton({
  tailoredResume,
  token,
}: {
  tailoredResume: TailorResult["tailored_resume"];
  token: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const handleSetDefault = async () => {
    if (!token) return;
    setState("saving");
    try {
      const {
        contact,
        summary,
        work_experience,
        education,
        skills,
        achievements,
      } = tailoredResume;
      await apiClient.resume.setDefault(
        {
          contact,
          summary,
          work_experience,
          education,
          skills,
          achievements,
        } as UpdateResumeRequest,
        token
      );
      setState("saved");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={state === "saved" ? "ghost" : "primary"}
        size="sm"
        onClick={handleSetDefault}
        disabled={state === "saving" || state === "saved"}
        loading={state === "saving"}
      >
        {state === "saved"
          ? "Default Updated"
          : state === "saving"
            ? "Saving..."
            : "Set as Default Resume"}
      </Button>
      {state === "error" && (
        <span className="text-sm" style={{ color: "#ef4444" }}>
          Failed
        </span>
      )}
    </div>
  );
}

const FEEDBACK_TYPE_COLORS: Record<FeedbackType, string> = {
  approved: "#22c55e",
  rejected: "#ef4444",
  edited: "#3b82f6",
  flagged: "#eab308",
};

function VoiceTab({ token }: { token: string }) {
  const [entries, setEntries] = useState<VoiceFeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const loadEntries = useCallback(async () => {
    try {
      const data = await apiClient.voiceFeedback.list(
        token,
        filter || undefined
      );
      setEntries(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleReclassify = async (id: string, newType: FeedbackType) => {
    try {
      const updated = await apiClient.voiceFeedback.reclassify(
        id,
        newType,
        token
      );
      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? updated : e))
          .filter((e) => !filter || e.feedback_type === filter)
      );
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.voiceFeedback.delete(id, token);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div
        className="text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Loading voice feedback...
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setLoading(true);
          }}
          className="text-sm"
        >
          <option value="">All types</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="edited">Edited</option>
          <option value="flagged">Flagged</option>
        </Select>
        <span
          className="text-sm self-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {entries.length} entries
        </span>
      </div>

      {entries.length === 0 ? (
        <div
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          No feedback entries{filter ? ` with type "${filter}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-md p-4"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={entry.feedback_type}
                    onChange={(e) =>
                      handleReclassify(
                        entry.id,
                        e.target.value as FeedbackType
                      )
                    }
                    className="text-xs"
                    style={{
                      color: FEEDBACK_TYPE_COLORS[entry.feedback_type],
                    }}
                  >
                    {Object.keys(FEEDBACK_TYPE_COLORS)
                      .filter(
                        (t) =>
                          t !== "edited" || entry.feedback_type === "edited"
                      )
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                  </Select>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {entry.job_context}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <div
                className="text-sm whitespace-pre-line"
                style={{ color: "var(--color-text-primary)" }}
              >
                {entry.original_text.length > 300
                  ? `${entry.original_text.slice(0, 300)}...`
                  : entry.original_text}
              </div>
              {entry.note && (
                <div
                  className="mt-2 text-xs italic"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Note: {entry.note}
                </div>
              )}
              {entry.final_text && (
                <div className="mt-2">
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Edited to:
                  </span>
                  <div className="text-sm mt-1" style={{ color: "#3b82f6" }}>
                    {entry.final_text.length > 300
                      ? `${entry.final_text.slice(0, 300)}...`
                      : entry.final_text}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
