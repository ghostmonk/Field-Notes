import { SiteConfig, LayoutConfig } from './types';
import config from '../../site.config.json';
import layoutConfig from '@/templates/default/layout.config.json';

const siteConfig = config satisfies SiteConfig;

export function getSiteConfig(): SiteConfig {
  return siteConfig;
}

export function getLayoutConfig(): LayoutConfig {
  return layoutConfig as LayoutConfig;
}
