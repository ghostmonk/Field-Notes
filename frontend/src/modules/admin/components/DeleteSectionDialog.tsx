import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

interface DeleteSectionDialogProps {
  sectionTitle: string;
  hasChildren: boolean;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteSectionDialog({
  sectionTitle,
  hasChildren,
  open,
  onConfirm,
  onCancel,
}: DeleteSectionDialogProps) {
  const description = hasChildren
    ? `This will permanently delete "${sectionTitle}" and all its child sections. Content in deleted sections will become orphaned.`
    : `This will permanently delete "${sectionTitle}".`;

  return (
    <ConfirmDeleteDialog
      open={open}
      title="Delete Section"
      description={description}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmTestId="confirm-delete-section"
    />
  );
}
