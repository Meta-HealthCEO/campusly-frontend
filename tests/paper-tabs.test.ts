import { describe, expect, it } from 'vitest';
import { paperTabFromParam } from '../src/lib/paper-tabs';

describe('paperTabFromParam', () => {
  it.each(['paper', 'memo', 'assignments', 'marking'] as const)('opens the %s tab', (tab) => {
    expect(paperTabFromParam(tab)).toBe(tab);
  });

  it.each([null, '', 'MARKING', '<script>', 'grades'])('falls back to the paper for %s', (value) => {
    expect(paperTabFromParam(value)).toBe('paper');
  });
});
