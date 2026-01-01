import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors using our design tokens
        brand: {
          primary: "var(--color-brand-primary)",
          secondary: "var(--color-brand-secondary)",
        },
        // Surface colors
        surface: {
          primary: "var(--color-surface-primary)",
          secondary: "var(--color-surface-secondary)",
          tertiary: "var(--color-surface-tertiary)",
          inverse: "var(--color-surface-inverse)",
        },
        // Text colors
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          inverse: "var(--color-text-inverse)",
          brand: "var(--color-text-brand)",
          link: "var(--color-text-link)",
        },
        // Border colors
        border: {
          primary: "var(--color-border-primary)",
          secondary: "var(--color-border-secondary)",
          focus: "var(--color-border-focus)",
        },
        // Status colors
        status: {
          success: "var(--color-status-success)",
          warning: "var(--color-status-warning)",
          error: "var(--color-status-error)",
          info: "var(--color-status-info)",
        },
        // Legacy support for existing code
        background: "var(--color-surface-primary)",
        foreground: "var(--color-text-primary)",
      },
      fontFamily: {
        sans: ["var(--font-family-sans)"],
        serif: ["var(--font-family-serif)"],
        mono: ["var(--font-family-mono)"],
      },
      fontSize: {
        xs: "var(--font-size-xs)",
        sm: "var(--font-size-sm)",
        base: "var(--font-size-base)",
        lg: "var(--font-size-lg)",
        xl: "var(--font-size-xl)",
        "2xl": "var(--font-size-2xl)",
        "3xl": "var(--font-size-3xl)",
        "4xl": "var(--font-size-4xl)",
      },
      fontWeight: {
        light: "var(--font-weight-light)",
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
      },
      lineHeight: {
        tight: "var(--line-height-tight)",
        normal: "var(--line-height-normal)",
        relaxed: "var(--line-height-relaxed)",
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "2xl": "var(--space-2xl)",
        "3xl": "var(--space-3xl)",
        "4xl": "var(--space-4xl)",
        "5xl": "var(--space-5xl)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        DEFAULT: "var(--transition-normal)",
        slow: "var(--transition-slow)",
      },
      zIndex: {
        dropdown: "var(--z-index-dropdown)",
        sticky: "var(--z-index-sticky)",
        fixed: "var(--z-index-fixed)",
        modal: "var(--z-index-modal)",
        popover: "var(--z-index-popover)",
        tooltip: "var(--z-index-tooltip)",
        notification: "var(--z-index-notification)",
      },
    },
  },
  plugins: [],
};

export default config;
