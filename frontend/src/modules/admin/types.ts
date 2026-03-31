import { SectionContentType } from "@/shared/types/api";

export type ContentRowKind = "content" | "section";

export interface ContentRow {
  id: string;
  title: string;
  kind: ContentRowKind;
  contentType: SectionContentType | null;
  isPublished: boolean;
  updatedDate: string;
  slug: string;
}
