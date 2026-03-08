import { describe, it, expect } from 'vitest';
import { escapeHtmlAttr, stripEmptyParagraphs } from './htmlUtils';

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

describe('stripEmptyParagraphs', () => {
  it('strips leading empty paragraphs', () => {
    expect(stripEmptyParagraphs('<p></p><video src="/v.mp4"></video>'))
      .toBe('<video src="/v.mp4"></video>');
  });

  it('strips trailing empty paragraphs', () => {
    expect(stripEmptyParagraphs('<p>Hello</p><p></p>'))
      .toBe('<p>Hello</p>');
  });

  it('strips both leading and trailing', () => {
    expect(stripEmptyParagraphs('<p></p><p>Content</p><p></p>'))
      .toBe('<p>Content</p>');
  });

  it('strips multiple consecutive empty paragraphs', () => {
    expect(stripEmptyParagraphs('<p></p><p></p><img src="/a.jpg"><p></p>'))
      .toBe('<img src="/a.jpg">');
  });

  it('preserves paragraphs with content', () => {
    expect(stripEmptyParagraphs('<p>Keep me</p>'))
      .toBe('<p>Keep me</p>');
  });

  it('handles empty string', () => {
    expect(stripEmptyParagraphs('')).toBe('');
  });

  it('handles whitespace-only paragraphs', () => {
    expect(stripEmptyParagraphs('<p>  </p><p>Real</p>'))
      .toBe('<p>Real</p>');
  });
});
