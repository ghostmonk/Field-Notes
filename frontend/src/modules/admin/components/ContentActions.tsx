import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu";
import { Button } from "@/components/admin-ui/button";
import { MoreHorizontal, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
import { ContentRow } from "../types";

interface ContentActionsProps {
  row: ContentRow;
  onEdit: (row: ContentRow) => void;
  onTogglePublish: (row: ContentRow) => void;
  onDelete: (row: ContentRow) => void;
}

export function ContentActions({
  row,
  onEdit,
  onTogglePublish,
  onDelete,
}: ContentActionsProps) {
  if (row.kind === "section") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          data-testid={`actions-trigger-${row.id}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onEdit(row)}
          data-testid={`action-edit-${row.id}`}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onTogglePublish(row)}
          data-testid={`action-toggle-publish-${row.id}`}
        >
          {row.isPublished ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Unpublish
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Publish
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(row)}
          data-testid={`action-delete-${row.id}`}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
