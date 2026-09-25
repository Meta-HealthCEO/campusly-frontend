import type { ExamTopic } from './exam-map';

const LATER = 'Algebra, patterns, finance and probability';

/** The approved mockup's learner (direction C). Example names and numbers, shown only in the /design gallery. */
export const EXAMPLE_READINESS = {
  learner: 'Anele Khumalo',
  grade: 'Grade 12',
  subject: 'Mathematics',
  teacher: 'Ms Dube',
  paper: 'Paper 1',
  examDate: new Date(2026, 9, 27),
  total: 150,
  answers: 211,
  band: { low: 58, high: 64, target: 75 },
  topics: [
    { id: 'functions', name: 'Functions & graphs', section: 'Functions and calculus', marks: 35, mastery: 49 },
    { id: 'calculus', name: 'Differential calculus', section: 'Functions and calculus', marks: 35, mastery: 52 },
    { id: 'algebra', name: 'Algebra, equations & inequalities', section: LATER, marks: 25, mastery: 78 },
    { id: 'sequences', name: 'Sequences & series', section: LATER, marks: 25, mastery: 71 },
    { id: 'finance', name: 'Financial maths', section: LATER, marks: 15, mastery: 82 },
    { id: 'probability', name: 'Probability', section: LATER, marks: 15, mastery: 64 },
  ] satisfies ExamTopic[],
  trend: [
    { label: 'W1', value: 48 }, { label: 'W2', value: 51 }, { label: 'W3', value: 53 },
    { label: 'W4', value: 55 }, { label: 'W5', value: 58 }, { label: 'Now', value: 61 },
  ],
  nextUp: {
    eyebrow: 'Sat · Mock exam · 75 marks',
    title: 'Paper 1 mini-mock, aimed at your gaps',
    detail: '90 minutes, timed. Functions and calculus weighted up.',
    actionLabel: 'Book it',
    // An in-page anchor, not '/design#next-up': the gallery route only exists from Task 12, and tests/internal-links rejects links to missing pages.
    href: '#next-up',
  },
};
