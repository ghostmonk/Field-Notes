export interface HeroConfig {
  showOnHome: boolean;
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
  github?: {
    username: string;
    url: string;
  };
  footer: {
    links: Array<{ label: string; href: string }>;
  };
}
