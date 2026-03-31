import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin-ui/table";
import { Badge } from "@/components/admin-ui/badge";
import { ContentRow } from "../types";
import { ContentActions } from "./ContentActions";

interface ContentTableProps {
  rows: ContentRow[];
  onEdit: (row: ContentRow) => void;
  onTogglePublish: (row: ContentRow) => void;
  onDelete: (row: ContentRow) => void;
  onSelectSection: (id: string) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeLabel(row: ContentRow): string {
  if (row.kind === "section") return "Section";
  const labels: Record<string, string> = {
    story: "Story",
    project: "Project",
    photo_essay: "Photo Essay",
    page: "Page",
  };
  return row.contentType ? (labels[row.contentType] ?? row.contentType) : "\u2014";
}

export function ContentTable({
  rows,
  onEdit,
  onTogglePublish,
  onDelete,
  onSelectSection,
}: ContentTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="content-empty">
        No content in this section.
      </p>
    );
  }

  return (
    <Table data-testid="content-table">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={`${row.kind}-${row.id}`}
            data-testid={`content-row-${row.id}`}
          >
            <TableCell className="font-medium">
              {row.kind === "section" ? (
                <button
                  className="hover:underline text-left"
                  onClick={() => onSelectSection(row.id)}
                  data-testid={`section-link-${row.id}`}
                >
                  {row.title}
                </button>
              ) : (
                row.title
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={row.kind === "section" ? "secondary" : "outline"}
                data-testid={`type-badge-${row.id}`}
              >
                {typeLabel(row)}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={row.isPublished ? "default" : "secondary"}
                className={
                  row.isPublished
                    ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10"
                    : ""
                }
                data-testid={`status-badge-${row.id}`}
              >
                {row.isPublished ? "Published" : "Draft"}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(row.updatedDate)}
            </TableCell>
            <TableCell>
              <ContentActions
                row={row}
                onEdit={onEdit}
                onTogglePublish={onTogglePublish}
                onDelete={onDelete}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
