import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { ContentRow } from "../types";

interface DeleteContentDialogProps {
  row: ContentRow | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteContentDialog({
  row,
  onConfirm,
  onCancel,
}: DeleteContentDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={!!row}
      title={`Delete ${row?.title}?`}
      description={`This action cannot be undone. This will permanently delete this ${row?.contentType ?? "item"}.`}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
