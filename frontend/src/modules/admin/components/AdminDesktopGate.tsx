import { useEffect, useState } from "react";

const DESKTOP_MIN_WIDTH = 1024;

export function AdminDesktopGate({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= DESKTOP_MIN_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isDesktop) {
    return (
      <div
        className="flex h-dvh items-center justify-center p-8 text-center"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">Command Center</h1>
          <p className="text-[var(--muted-foreground)]">
            The command center requires a desktop browser. Use the site
            navigation to manage content on mobile.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
