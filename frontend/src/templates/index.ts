import { getSiteConfig } from '@/config';

export async function loadTemplate(): Promise<void> {
  const { template } = getSiteConfig();
  await import(`./${template}/index.ts`);
}
