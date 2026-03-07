import { describe, it, expect } from 'vitest';
import { contentRegistry } from './contentRegistry';
import type { ContentType } from './types';

function isComponent(value: unknown): boolean {
  if (typeof value === 'function') return true;
  // React.memo and forwardRef return objects with $$typeof
  if (value && typeof value === 'object' && '$$typeof' in value) return true;
  return false;
}

describe('contentRegistry', () => {
  const expectedTypes: ContentType[] = ['story', 'project', 'page'];

  it('has entries for all content types', () => {
    for (const type of expectedTypes) {
      expect(contentRegistry[type]).toBeDefined();
    }
  });

  it('story has listItem and detail components', () => {
    expect(isComponent(contentRegistry.story.listItem)).toBe(true);
    expect(isComponent(contentRegistry.story.detail)).toBe(true);
  });

  it('project has listItem and detail components', () => {
    expect(isComponent(contentRegistry.project.listItem)).toBe(true);
    expect(isComponent(contentRegistry.project.detail)).toBe(true);
  });

  it('page has null components (rendered by static-page display)', () => {
    expect(contentRegistry.page.listItem).toBeNull();
    expect(contentRegistry.page.detail).toBeNull();
  });
});
