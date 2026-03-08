import { describe, it, expect } from 'vitest';
import { splitLeadingImage } from './StoryCard';

describe('splitLeadingImage', () => {
  it('extracts img wrapped in a paragraph', () => {
    const html = '<p><img src="/photo.jpg" alt="test"></p><p>Hello world</p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<img src="/photo.jpg" alt="test">');
    expect(rest).toBe('<p>Hello world</p>');
  });

  it('extracts bare img at the start', () => {
    const html = '<img src="/photo.jpg"><p>Text</p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<img src="/photo.jpg">');
    expect(rest).toBe('<p>Text</p>');
  });

  it('returns null leadImage when content starts with text', () => {
    const html = '<p>No image here</p><img src="/later.jpg">';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBeNull();
    expect(rest).toBe(html);
  });

  it('handles empty content', () => {
    const { leadImage, rest } = splitLeadingImage('');
    expect(leadImage).toBeNull();
    expect(rest).toBe('');
  });

  it('handles content with only an image', () => {
    const html = '<p><img src="/only.jpg" alt="solo"></p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<img src="/only.jpg" alt="solo">');
    expect(rest).toBe('');
  });

  it('handles leading whitespace before image', () => {
    const html = '  <p><img src="/photo.jpg"></p><p>After</p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<img src="/photo.jpg">');
    expect(rest).toBe('<p>After</p>');
  });

  it('extracts video wrapped in a paragraph', () => {
    const html = '<p><video src="/clip.mp4" controls></video></p><p>Description</p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<video src="/clip.mp4" controls></video>');
    expect(rest).toBe('<p>Description</p>');
  });

  it('extracts bare video at the start', () => {
    const html = '<video src="/clip.mp4" controls></video><p>Text</p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<video src="/clip.mp4" controls></video>');
    expect(rest).toBe('<p>Text</p>');
  });

  it('extracts video with source children', () => {
    const html = '<video controls><source src="/clip.mp4" type="video/mp4"></video><p>After</p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<video controls><source src="/clip.mp4" type="video/mp4"></video>');
    expect(rest).toBe('<p>After</p>');
  });

  it('skips empty paragraphs before media', () => {
    const html = '<p></p><video src="/clip.mp4" controls></video><p>Text</p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<video src="/clip.mp4" controls></video>');
    expect(rest).toBe('<p>Text</p>');
  });

  it('skips multiple empty paragraphs before image', () => {
    const html = '<p></p><p></p><p><img src="/photo.jpg"></p><p>After</p>';
    const { leadImage, rest } = splitLeadingImage(html);
    expect(leadImage).toBe('<img src="/photo.jpg">');
    expect(rest).toBe('<p>After</p>');
  });
});
