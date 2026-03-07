import { SiteConfig } from './types';
import config from '../../../site.config.json';

const siteConfig: SiteConfig = config as SiteConfig;

export function getSiteConfig(): SiteConfig {
  return siteConfig;
}
