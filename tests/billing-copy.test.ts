import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { planFeatures, planLines, proEndsAt } from '../src/lib/billing-copy';

describe('planLines', () => {
  it('names the free allowance and what stays free', () => {
    expect(planLines('free')).toEqual([
      '20 AI actions a month: lessons, test papers, memos, homework drafts and marking',
      'Classes, homework, register and gradebook',
    ]);
  });

  it('names the Pro allowance, what Pro adds and the price', () => {
    expect(planLines('pro')).toEqual([
      'Up to 500 AI actions a month',
      'Everything in Free, plus lesson progress for each class',
      'R149 a month after a 14-day free trial',
    ]);
  });
});

describe('proEndsAt', () => {
  it('is the end of the paid period', () => {
    expect(proEndsAt({ currentPeriodEnd: '2026-10-25T00:00:00Z', trialEndsAt: null })).toBe('2026-10-25T00:00:00Z');
  });

  it('is the end of the trial when the teacher canceled during it (nothing paid yet)', () => {
    expect(proEndsAt({ currentPeriodEnd: null, trialEndsAt: '2026-10-05T00:00:00Z' })).toBe('2026-10-05T00:00:00Z');
  });

  it('is null with neither', () => {
    expect(proEndsAt({})).toBeNull();
  });
});

describe('the landing page plans', () => {
  it('promise only what is real: Free has everything but the AI limit; Pro raises the AI limit', () => {
    expect(planFeatures('free')).toEqual([
      '20 AI actions a month: lessons, test papers, memos, homework drafts and marking',
      'Classes, homework, register and gradebook',
    ]);
    expect(planFeatures('pro')).toEqual(['Up to 500 AI actions a month', 'Everything in Free, plus lesson progress for each class']);
    expect(planLines('pro').slice(0, 2)).toEqual(planFeatures('pro'));
  });

  it('draws its feature lists from planFeatures, with no class limits', () => {
    const source = readFileSync(path.resolve(__dirname, '../src/components/teachers-landing/TeacherPlans.tsx'), 'utf8');
    expect(source).toContain("planFeatures('free')");
    expect(source).toContain("planFeatures('pro')");
    expect(source).not.toMatch(/teaching group|unlimited/i);
  });
});
