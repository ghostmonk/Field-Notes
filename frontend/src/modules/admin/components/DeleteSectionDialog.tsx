import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin-ui/alert-dialog";

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
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Section</AlertDialogTitle>
          <AlertDialogDescription>
            {hasChildren
              ? `This will permanently delete "${sectionTitle}" and all its child sections. Content in deleted sections will become orphaned.`
              : `This will permanently delete "${sectionTitle}".`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
            data-testid="confirm-delete-section"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
