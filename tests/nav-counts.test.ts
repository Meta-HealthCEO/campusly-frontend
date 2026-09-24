import { describe, expect, it } from 'vitest';
import { navBadgeText } from '../src/lib/nav-counts';

describe('navBadgeText', () => {
  const counts = { marking: 14, messages: 0 };

  it('shows a count only when there is something waiting', () => {
    expect(navBadgeText('marking', counts)).toBe('14');
    expect(navBadgeText('messages', counts)).toBeNull();
  });

  it('shows nothing when a count failed to load or does not apply', () => {
    expect(navBadgeText('marking', { marking: null, messages: null })).toBeNull();
    expect(navBadgeText(undefined, counts)).toBeNull();
  });

  it('caps big numbers so the badge stays small', () => {
    expect(navBadgeText('marking', { marking: 240, messages: 0 })).toBe('99+');
  });
});
