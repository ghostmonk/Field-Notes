import { useEffect, useState } from "react";

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  );
}

export function AdminDesktopGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  if (isMobile) {
    return (
      <div className="admin-theme flex h-dvh items-center justify-center bg-background text-foreground p-8 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">Master Control</h1>
          <p className="text-muted-foreground">
            Master control requires a desktop browser. Use the site
            navigation to manage content on mobile.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
