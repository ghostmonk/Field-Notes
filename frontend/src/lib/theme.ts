export type Theme = "light" | "dark" | "system";

export function getSystemTheme(): "light" | "dark" {
    if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
}

export function getEffectiveTheme(theme: Theme): "light" | "dark" {
    return theme === "system" ? getSystemTheme() : theme;
}

export function applyTheme(effective: "light" | "dark") {
    if (typeof window !== "undefined") {
        document.documentElement.setAttribute("data-theme", effective);
        if (effective === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }
}

export function applyStoredTheme() {
    const stored = localStorage.getItem("theme");
    const theme = stored && ["light", "dark", "system"].includes(stored) ? stored : "system";
    applyTheme(getEffectiveTheme(theme as Theme));
}
