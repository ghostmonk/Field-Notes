import { describe, it, expect } from 'vitest';
import { escapeHtmlAttr } from './useImageUpload';

describe('escapeHtmlAttr', () => {
  it('escapes double quotes', () => {
    expect(escapeHtmlAttr('a "quoted" value')).toBe('a &quot;quoted&quot; value');
  });

  it('escapes ampersands', () => {
    expect(escapeHtmlAttr('cats & dogs')).toBe('cats &amp; dogs');
  });

  it('escapes both together', () => {
    expect(escapeHtmlAttr('"Tom & Jerry"')).toBe('&quot;Tom &amp; Jerry&quot;');
  });

  it('passes through safe strings unchanged', () => {
    expect(escapeHtmlAttr('A photo of a sunset')).toBe('A photo of a sunset');
  });

  it('handles empty string', () => {
    expect(escapeHtmlAttr('')).toBe('');
  });
});
