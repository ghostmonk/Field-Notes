import Link from "next/link";
import { useSession } from "next-auth/react";
import { HiPlus } from "react-icons/hi";

interface SectionAdminBarProps {
  sectionId: string;
}

export function SectionAdminBar({ sectionId }: SectionAdminBarProps) {
  const { data: session } = useSession();

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="flex gap-2 mb-md" data-testid="section-admin-bar">
      <Link
        href={{ pathname: "/editor", query: { section_id: sectionId } }}
        className="btn btn--primary btn--sm"
        data-testid="section-add-content"
      >
        <HiPlus className="md:hidden" aria-hidden="true" />
        <span className="hidden md:inline">Add Content</span>
        <span className="md:hidden">Add</span>
      </Link>
      <Link
        href={{ pathname: "/admin", query: { section: sectionId } }}
        className="btn btn--secondary btn--sm hidden md:inline-flex"
        data-testid="section-manage"
      >
        Manage Section
      </Link>
    </div>
  );
}
