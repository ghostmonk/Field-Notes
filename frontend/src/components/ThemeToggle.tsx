import { useEffect, useState } from "react";
import { FaSun, FaMoon, FaDesktop } from "react-icons/fa6";
import { type Theme, getEffectiveTheme, applyTheme } from "@/lib/theme";

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>("system");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const storedTheme = localStorage.getItem("theme");
                if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
                    setTheme(storedTheme as Theme);
                }
            } catch (error) {
                console.warn("Error reading theme from localStorage:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!isLoading && typeof window !== "undefined") {
            try {
                localStorage.setItem("theme", theme);
            } catch (error) {
                console.warn("Error saving theme to localStorage:", error);
            }
        }
    }, [theme, isLoading]);

    useEffect(() => {
        if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handleChange = () => {
                applyTheme(getEffectiveTheme("system"));
            };

            mediaQuery.addEventListener("change", handleChange);
            return () => mediaQuery.removeEventListener("change", handleChange);
        }
    }, [theme]);

    useEffect(() => {
        if (!isLoading) {
            applyTheme(getEffectiveTheme(theme));
        }
    }, [theme, isLoading]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    if (isLoading) return null;

    const effectiveTheme = getEffectiveTheme(theme);

    return (
        <>
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                {/* System/Auto option */}
                <button
                    onClick={() => handleThemeChange("system")}
                    className={`flex items-center justify-center w-8 h-6 rounded transition-all duration-200 ${
                        theme === "system"
                            ? "bg-blue-500 text-white shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                    aria-label="Use system theme"
                    title={`System theme (currently ${effectiveTheme})`}
                >
                    <FaDesktop size={12} />
                </button>

                {/* Light option */}
                <button
                    onClick={() => handleThemeChange("light")}
                    className={`flex items-center justify-center w-8 h-6 rounded transition-all duration-200 ${
                        theme === "light"
                            ? "bg-yellow-400 text-white shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                    aria-label="Use light theme"
                    title="Light theme"
                >
                    <FaSun size={12} />
                </button>

                {/* Dark option */}
                <button
                    onClick={() => handleThemeChange("dark")}
                    className={`flex items-center justify-center w-8 h-6 rounded transition-all duration-200 ${
                        theme === "dark"
                            ? "bg-gray-800 text-white shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                    aria-label="Use dark theme"
                    title="Dark theme"
                >
                    <FaMoon size={12} />
                </button>
            </div>
            <span className="sr-only" role="status" aria-live="polite" data-testid="theme-announcement">
                {`${theme === 'system' ? `System (${effectiveTheme})` : theme} theme active`}
            </span>
        </>
    );
}
