import { SectionContentType, DisplayType } from "@/shared/types/api";

export const CONTENT_TYPE_OPTIONS: { value: SectionContentType; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "project", label: "Project" },
  { value: "photo_essay", label: "Photo Essay" },
  { value: "page", label: "Page" },
];

export const DISPLAY_TYPE_OPTIONS: { value: DisplayType; label: string }[] = [
  { value: "feed", label: "Feed" },
  { value: "card-grid", label: "Card Grid" },
  { value: "static-page", label: "Static Page" },
  { value: "gallery", label: "Gallery" },
];

export const CONTENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONTENT_TYPE_OPTIONS.map((t) => [t.value, t.label])
);
