import { SiteConfig } from './types';
import config from '../../site.config.json';

const siteConfig = config satisfies SiteConfig;

export function getSiteConfig(): SiteConfig {
  return siteConfig;
}
