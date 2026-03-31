import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

interface SectionAdminBarProps {
  sectionId: string;
}

export function SectionAdminBar({ sectionId }: SectionAdminBarProps) {
  const { data: session } = useSession();
  const router = useRouter();

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="flex gap-2 mb-md" data-testid="section-admin-bar">
      <button
        className="btn btn--primary btn--sm"
        onClick={() =>
          router.push({ pathname: "/editor", query: { section_id: sectionId } })
        }
        data-testid="section-add-content"
      >
        Add Content
      </button>
      <button
        className="btn btn--secondary btn--sm"
        onClick={() =>
          router.push({ pathname: "/admin", query: { section: sectionId } })
        }
        data-testid="section-manage"
      >
        Manage Section
      </button>
    </div>
  );
}
