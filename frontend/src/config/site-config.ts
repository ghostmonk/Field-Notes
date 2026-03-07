import { SiteConfig } from './types';
import config from '../../../site.config.json';

const requiredKeys = ['site', 'template', 'fonts', 'navigation', 'footer'] as const;
for (const key of requiredKeys) {
  if (!(key in config)) {
    throw new Error(`site.config.json is missing required key: "${key}"`);
  }
}

const siteConfig: SiteConfig = config as SiteConfig;

export function getSiteConfig(): SiteConfig {
  return siteConfig;
}
