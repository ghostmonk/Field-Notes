import { describe, it, expect } from 'vitest';
import { getSiteConfig } from './site-config';

describe('getSiteConfig', () => {
  it('returns a config object with required sections', () => {
    const config = getSiteConfig();
    expect(config).toHaveProperty('site');
    expect(config).toHaveProperty('fonts');
    expect(config).toHaveProperty('footer');
  });

  it('site section has title, tagline, author, copyright', () => {
    const { site } = getSiteConfig();
    expect(typeof site.title).toBe('string');
    expect(typeof site.tagline).toBe('string');
    expect(typeof site.author).toBe('string');
    expect(typeof site.copyright).toBe('string');
  });

  it('fonts section has heading and body', () => {
    const { fonts } = getSiteConfig();
    expect(typeof fonts.heading).toBe('string');
    expect(typeof fonts.body).toBe('string');
  });

  it('footer links are valid', () => {
    const { footer } = getSiteConfig();
    expect(Array.isArray(footer.links)).toBe(true);
    for (const link of footer.links) {
      expect(typeof link.label).toBe('string');
      expect(typeof link.href).toBe('string');
    }
  });
});
