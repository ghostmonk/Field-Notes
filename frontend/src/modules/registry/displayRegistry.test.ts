import { describe, it, expect } from 'vitest';
import { displayRegistry } from './displayRegistry';
import type { DisplayType } from './types';

describe('displayRegistry', () => {
  const expectedTypes: DisplayType[] = ['feed', 'card-grid', 'static-page'];

  it('has entries for all display types', () => {
    for (const type of expectedTypes) {
      expect(displayRegistry[type]).toBeDefined();
    }
  });

  it('maps each display type to a component', () => {
    for (const type of expectedTypes) {
      expect(typeof displayRegistry[type]).toBe('function');
    }
  });
});
