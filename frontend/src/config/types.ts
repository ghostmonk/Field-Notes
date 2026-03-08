export interface HeroConfig {
  title: string;
  subtitle: string;
  showOnHome: boolean;
}

export interface LayoutConfig {
  structure: "top-content-bottom" | "sidebar-content" | "top-content";
  navigation: {
    desktop: "top" | "sidebar";
    mobile: "bottom" | "hamburger";
  };
  footer: {
    position: "fixed-bottom" | "inline";
    showAboveBottomNav: boolean;
  };
  content: {
    maxWidth: string;
    centered: boolean;
  };
}

export interface SiteConfig {
  site: {
    title: string;
    tagline: string;
    author: string;
    copyright: string;
  };
  hero: HeroConfig;
  fonts: {
    heading: string;
    body: string;
  };
  navigation: {
    iconMap: Record<string, string>;
  };
  footer: {
    links: Array<{ label: string; href: string }>;
  };
}
