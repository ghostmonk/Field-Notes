export interface HeroConfig {
  title?: string;
  subtitle?: string;
  showOnHome: boolean;
}

export interface LayoutConfig {
  structure: "top-content-bottom" | "sidebar-content" | "top-content";
  navigation: {
    desktop: "top" | "sidebar";
    mobile: "bottom" | "hamburger";
  };
}

export interface TemplateConfig {
  active: string;
}

export interface SiteConfig {
  site: {
    title: string;
    tagline: string;
    author: string;
    copyright: string;
  };
  template: TemplateConfig;
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
