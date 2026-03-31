import { useSession } from "next-auth/react";

interface AdminDraftBadgeProps {
  isPublished: boolean;
  className?: string;
}

export function AdminDraftBadge({
  isPublished,
  className = "",
}: AdminDraftBadgeProps) {
  const { data: session } = useSession();
  if (isPublished || session?.user?.role !== "admin") return null;

  return (
    <span className={`badge badge--draft ${className}`.trim()}>Draft</span>
  );
}
