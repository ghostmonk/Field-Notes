import { describe, it, expect } from 'vitest';
import { estimateReadingTime } from './readingTime';

describe('estimateReadingTime', () => {
  it('returns 1 min for short content', () => {
    expect(estimateReadingTime('Hello world')).toBe('1 min read');
  });

  it('calculates based on 200 wpm', () => {
    const words = Array(600).fill('word').join(' ');
    expect(estimateReadingTime(words)).toBe('3 min read');
  });

  it('strips HTML tags before counting', () => {
    const html = '<p>Hello</p> <strong>world</strong> <img src="test.jpg">';
    expect(estimateReadingTime(html)).toBe('1 min read');
  });

  it('returns 1 min for empty content', () => {
    expect(estimateReadingTime('')).toBe('1 min read');
  });
});
