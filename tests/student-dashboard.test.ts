import { describe, expect, it } from 'vitest';
import { learnerGreeting, learnerOverdue } from '../src/lib/student-dashboard';
import type { Student } from '../src/types';

const student = (over: Record<string, unknown>): Student => ({ id: 's1', admissionNumber: 'GFP-1', ...over }) as unknown as Student;

describe('learnerGreeting', () => {
  it('greets the signed-in learner by first name', () => {
    expect(learnerGreeting('Lebo', null)).toBe('Welcome back, Lebo!');
  });

  it('falls back to the name on the learner record, populated as userId', () => {
    expect(learnerGreeting(undefined, student({ userId: { firstName: 'Lebo', lastName: 'Mthembu' } }))).toBe('Welcome back, Lebo!');
  });

  it('never calls the learner "Student"', () => {
    expect(learnerGreeting('', null)).toBe('Welcome back!');
    expect(learnerGreeting('  ', student({}))).toBe('Welcome back!');
  });
});

describe('learnerOverdue', () => {
  it('adds missed tests to overdue homework', () => {
    expect(learnerOverdue({ homeworkOverdue: 2, testsOverdue: 1 })).toBe(3);
  });

  it('copes with a server that does not send tests yet', () => {
    expect(learnerOverdue({ homeworkOverdue: 2 })).toBe(2);
  });
});
