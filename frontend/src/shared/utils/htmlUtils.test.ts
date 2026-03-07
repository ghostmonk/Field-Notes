import { describe, it, expect } from 'vitest';
import { escapeHtmlAttr } from './htmlUtils';

describe('escapeHtmlAttr', () => {
  it('escapes double quotes', () => {
    expect(escapeHtmlAttr('a "quoted" value')).toBe('a &quot;quoted&quot; value');
  });

  it('escapes ampersands', () => {
    expect(escapeHtmlAttr('cats & dogs')).toBe('cats &amp; dogs');
  });

  it('escapes single quotes', () => {
    expect(escapeHtmlAttr("it's fine")).toBe('it&#39;s fine');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtmlAttr('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes all special characters together', () => {
    expect(escapeHtmlAttr('"Tom & Jerry" <show>')).toBe(
      '&quot;Tom &amp; Jerry&quot; &lt;show&gt;'
    );
  });

  it('passes through safe strings unchanged', () => {
    expect(escapeHtmlAttr('A photo of a sunset')).toBe('A photo of a sunset');
  });

  it('handles empty string', () => {
    expect(escapeHtmlAttr('')).toBe('');
  });
});
