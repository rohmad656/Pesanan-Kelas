import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-2', 'p-4')).toBe('p-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'is-true', false && 'is-false')).toContain('base is-true');
    expect(cn('base', true && 'is-true', false && 'is-false')).not.toContain('is-false');
  });

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });

  it('merges overlapping tailwind classes', () => {
    // text-red-500 and text-blue-500 overlap, the last one should win
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });
});
