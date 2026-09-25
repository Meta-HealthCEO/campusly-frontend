import { describe, expect, it } from 'vitest';
import { cn } from '../src/lib/utils';

/**
 * tailwind-merge only knows Tailwind's default scales, so it read `text-caption` (a Blueprint font size)
 * as a text colour and dropped it whenever a colour followed: every Badge, phone tab and toned StatCard
 * lost its size. cn() is taught the Blueprint theme keys (spec §2.3, §2.4).
 */
describe('cn() and the Blueprint scale', () => {
  it.each(['caption', 'small', 'body', 'h3', 'h2', 'h1', 'h1-desktop', 'display', 'eyebrow'])('keeps text-%s beside a text colour', (step) => {
    expect(cn(`text-${step}`, 'text-attention').split(' ')).toEqual([`text-${step}`, 'text-attention']);
  });

  it('still lets a later size replace an earlier one', () => {
    expect(cn('text-caption', 'text-h3')).toBe('text-h3');
    expect(cn('text-sm', 'text-small')).toBe('text-small');
  });

  it('merges the Blueprint radii, shadows and easing with the defaults', () => {
    expect(cn('rounded-control', 'rounded-full')).toBe('rounded-full');
    expect(cn('rounded-lg', 'rounded-card')).toBe('rounded-card');
    expect(cn('shadow-card', 'shadow-none')).toBe('shadow-none');
    expect(cn('ease-standard', 'ease-in')).toBe('ease-in');
  });
});
