import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/admin-ui/dialog";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import {
  CreateSectionRequest,
  DisplayType,
  SectionContentType,
} from "@/shared/types/api";
import {
  CONTENT_TYPE_OPTIONS,
  DISPLAY_TYPE_OPTIONS,
} from "@/shared/constants/sectionTypes";

interface AddSectionDialogProps {
  open: boolean;
  parentId: string;
  onSubmit: (data: CreateSectionRequest) => Promise<void>;
  onClose: () => void;
}

export function AddSectionDialog({
  open,
  parentId,
  onSubmit,
  onClose,
}: AddSectionDialogProps) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<SectionContentType>("story");
  const [displayType, setDisplayType] = useState<DisplayType>("feed");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        content_type: contentType,
        display_type: displayType,
        parent_id: parentId,
      });
      setTitle("");
      setContentType("story");
      setDisplayType("feed");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Child Section</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Section title"
              data-testid="add-section-title"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Content Type</label>
            <Select
              value={contentType}
              onValueChange={(v) => setContentType(v as SectionContentType)}
            >
              <SelectTrigger className="w-full" data-testid="add-section-content-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {CONTENT_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Type</label>
            <Select
              value={displayType}
              onValueChange={(v) => setDisplayType(v as DisplayType)}
            >
              <SelectTrigger className="w-full" data-testid="add-section-display-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {DISPLAY_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            data-testid="add-section-submit"
          >
            {submitting ? "Creating..." : "Create Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
