export interface HeroConfig {
  showOnHome: boolean;
}

export interface LayoutConfig {
  navigation: {
    desktop: "top";
    mobile: "bottom";
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
