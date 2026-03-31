import { SectionContentType, DisplayType, NavVisibility } from "@/shared/types/api";

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

export const CONTENT_TYPE_DISPLAYS: Record<SectionContentType, DisplayType[]> = {
  story: ["feed", "card-grid"],
  project: ["feed", "card-grid"],
  page: ["static-page"],
  photo_essay: ["gallery"],
};

export const NAV_VISIBILITY_OPTIONS: { value: NavVisibility; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "secondary", label: "Secondary" },
  { value: "hidden", label: "Hidden" },
];
