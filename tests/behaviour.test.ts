import { describe, it, expect } from 'vitest';
import { BEHAVIOUR_CATEGORIES, entryLabel, logProblem, pointsLabel, summaryLine, timelineTone } from '../src/lib/behaviour';

describe('behaviour wording', () => {
  it('shows points signed, as the server stores them', () => {
    expect(pointsLabel(2)).toBe('+2');
    expect(pointsLabel(-1)).toBe('−1');
    expect(pointsLabel(0)).toBe('');
  });

  it('labels an entry like the timeline does', () => {
    expect(entryLabel({ kind: 'merit', category: 'kindness', points: 2 })).toBe('Merit +2 · Kindness');
    expect(entryLabel({ kind: 'demerit', category: 'late', points: -1 })).toBe('Demerit −1 · Late');
    expect(entryLabel({ kind: 'incident', category: 'bullying', points: 0 })).toBe('Incident · Bullying');
  });

  it('offers the same categories as the server', () => {
    expect(BEHAVIOUR_CATEGORIES.merit.map((c) => c.value)).toEqual(['effort', 'kindness', 'academic', 'leadership', 'service', 'sport']);
    expect(BEHAVIOUR_CATEGORIES.demerit.map((c) => c.value)).toEqual(['late', 'homework', 'disruption', 'uniform', 'respect', 'language', 'other']);
    expect(BEHAVIOUR_CATEGORIES.incident.map((c) => c.value)).toEqual(['fighting', 'bullying', 'property', 'safety', 'other']);
  });
});

describe('logProblem', () => {
  it('says what is missing before anything is sent', () => {
    expect(logProblem({ studentId: '', kind: 'merit', category: 'effort', note: '' })).toBe('Pick a learner.');
    expect(logProblem({ studentId: 's1', kind: 'merit', category: '', note: '' })).toBe('Pick what the merit is for.');
    expect(logProblem({ studentId: 's1', kind: 'demerit', category: 'late', note: ' ' })).toBe('Say briefly what happened.');
    expect(logProblem({ studentId: 's1', kind: 'merit', category: 'effort', note: '' })).toBeNull();
  });
});

describe('the profile behaviour card', () => {
  it('sums up a learner in one line', () => {
    expect(summaryLine({ merits: 2, demerits: 1, incidents: 0, net: 1 })).toBe('2 merits · 1 demerit · no incidents');
    expect(summaryLine({ merits: 0, demerits: 0, incidents: 0, net: 0 })).toBe('Nothing logged yet');
  });

  it('colours a referral apart from behaviour', () => {
    expect(timelineTone('merit')).toBe('bg-success-soft text-success');
    expect(timelineTone('referral')).toBe('bg-info-soft text-info');
  });
});
