import { useState } from "react";
import { ResumeForm, DownloadButtons } from "@/modules/resume";
import { useResumeEditor } from "@/modules/resume";
import { useConfirm } from "@/components/ConfirmDialog";
import { apiClient } from "@/shared/lib/api-client";

interface ResumeBuilderPanelProps {
  token: string;
}

export function ResumeBuilderPanel({ token }: ResumeBuilderPanelProps) {
  const [remountKey, setRemountKey] = useState(0);

  return <ResumeBuilderInner key={remountKey} token={token} onRestored={() => setRemountKey((k) => k + 1)} />;
}

function ResumeBuilderInner({
  token,
  onRestored,
}: {
  token: string;
  onRestored: () => void;
}) {
  const editor = useResumeEditor();
  const confirm = useConfirm();
  const [restoreState, setRestoreState] = useState<
    "idle" | "restoring" | "restored" | "error"
  >("idle");

  const handleDelete = async () => {
    if (!editor.isExisting) return;
    const confirmed = await confirm({
      title: "Delete Resume",
      message: "Delete your resume? This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (confirmed) {
      await editor.handleDelete();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold">Resume Builder</h2>
        <div className="flex gap-3 items-center">
          <DownloadButtons resume={editor.resume} />
          {editor.isExisting && (
            <>
              <button
                type="button"
                onClick={async () => {
                  if (!token) return;
                  const confirmed = await confirm({
                    title: "Restore Original",
                    message:
                      "Replace the current resume with your original canonical version?",
                    confirmLabel: "Restore",
                  });
                  if (!confirmed) return;
                  setRestoreState("restoring");
                  try {
                    await apiClient.resume.restoreOriginal(token);
                    setRestoreState("restored");
                    onRestored();
                  } catch {
                    setRestoreState("error");
                  }
                }}
                disabled={restoreState === "restoring"}
                className="text-sm"
                style={{ color: "var(--color-accent)" }}
              >
                {restoreState === "restoring"
                  ? "Restoring..."
                  : "Restore Original"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      <ResumeForm editor={editor} />
    </div>
  );
}
