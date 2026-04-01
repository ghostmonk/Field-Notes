import { useEffect, useState } from "react";
import { FaSun, FaMoon, FaDesktop } from "react-icons/fa6";
import { type Theme, getEffectiveTheme, applyTheme } from "@/lib/theme";

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>("system");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("theme");
        if (stored && ["light", "dark", "system"].includes(stored)) {
            setTheme(stored as Theme);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handleChange = () => applyTheme(getEffectiveTheme("system"));
            mediaQuery.addEventListener("change", handleChange);
            return () => mediaQuery.removeEventListener("change", handleChange);
        }
    }, [theme]);

    useEffect(() => {
        if (!isLoading) {
            applyTheme(getEffectiveTheme(theme));
        }
    }, [theme, isLoading]);

    if (isLoading) return null;

    const cycleTheme = () => {
        const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
        setTheme(next);
        localStorage.setItem("theme", next);
    };

    const Icon = theme === "system" ? FaDesktop : theme === "light" ? FaSun : FaMoon;
    const effectiveTheme = getEffectiveTheme(theme);
    const label = theme === "system" ? `System (${effectiveTheme})` : theme;

    return (
        <button
            onClick={cycleTheme}
            className="theme-toggle"
            aria-label={`Theme: ${label}. Click to cycle.`}
            title={label}
            data-testid="theme-toggle"
        >
            <Icon size={16} />
        </button>
    );
}
