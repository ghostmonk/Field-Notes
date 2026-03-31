import React from "react";
import { useSession } from "next-auth/react";

interface AdminEditButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

export function AdminEditButton({
  onClick,
  label = "Edit",
  className = "",
  "data-testid": testId,
}: AdminEditButtonProps) {
  const { data: session } = useSession();
  if (session?.user?.role !== "admin") return null;

  return (
    <button
      onClick={onClick}
      className={`btn btn--secondary btn--sm ${className}`.trim()}
      data-testid={testId}
    >
      {label}
    </button>
  );
}
