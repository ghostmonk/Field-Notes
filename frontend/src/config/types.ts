export interface HeroConfig {
  showOnHome: boolean;
}

export interface TemplateConfig {
  active: string;
}

export interface HomepageBlockConfig {
  type: string;
  id: string;
  props?: Record<string, unknown>;
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
    serif?: string;
    mono?: string;
  };
  homepage?: {
    blocks: HomepageBlockConfig[];
  };
  github?: {
    username: string;
    url: string;
  };
  socials?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    x?: string;
    tiktok?: string;
    youtube?: string;
    spotify?: string;
  };
  footer: {
    links: Array<{ label: string; href: string }>;
  };
}
