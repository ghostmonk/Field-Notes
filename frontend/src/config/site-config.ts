import { SiteConfig, LayoutConfig } from './types';
import config from '../../site.config.json';
// Must match template.active in site.config.json and the CSS import in _app.tsx
import layoutConfig from '@/templates/default/layout.config.json';

const siteConfig = config satisfies SiteConfig;
const layoutConfigData: LayoutConfig = layoutConfig as LayoutConfig;

export function getSiteConfig(): SiteConfig {
  return siteConfig;
}

export function getLayoutConfig(): LayoutConfig {
  return layoutConfigData;
}
