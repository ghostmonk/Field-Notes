export interface SiteConfig {
  site: {
    title: string;
    tagline: string;
    author: string;
    copyright: string;
  };
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
