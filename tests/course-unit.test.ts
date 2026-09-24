import { describe, it, expect } from 'vitest';
import {
  ITEM_KIND_LABEL,
  defaultUnitTitle,
  formatMinutes,
  generationSummary,
  liveGeneration,
  moduleMinutes,
  releaseBlocker,
  schoolTermFor,
  unitChip,
  unitMinutes,
  unitStage,
  withPolledStatus,
} from '../src/lib/course-unit';
import type { CourseTree, GenerationState } from '../src/types/courses';

const gen = (g: Partial<GenerationState>): GenerationState => ({
  status: 'idle', total: 0, done: 0, failed: 0, message: '', startedAt: null, finishedAt: null, ...g,
});

type Item = CourseTree['modules'][number]['lessons'][number];
const item = (i: Partial<Item>): Item => ({
  id: 'l', schoolId: 's', courseId: 'c', moduleId: 'm', orderIndex: 0, title: 't', type: 'content',
  contentResourceId: null, textbookId: null, chapterId: null, homeworkId: null, quizQuestionIds: [],
  isGraded: false, passMarkPercent: 70, isRequiredToAdvance: false, maxAttempts: null, createdAt: '', updatedAt: '', ...i,
});

function unit(o: Partial<CourseTree>, itemStatuses: Array<Item['genStatus']> = ['ready', 'ready']): CourseTree {
  return {
    id: 'c', schoolId: 's', title: 'Mathematics · Grade 1 · Term 3', slug: 'x', description: '', coverImageUrl: '',
    subjectId: null, gradeLevel: null, tags: [], estimatedDurationHours: null, createdBy: 'u', status: 'draft',
    publishedBy: null, publishedAt: null, reviewNotes: '', passMarkPercent: 60, certificateEnabled: false, createdAt: '', updatedAt: '',
    kind: 'class_unit', outlineStatus: 'approved', generation: gen({ status: 'done', total: 2, done: 2 }),
    modules: [{ id: 'm', schoolId: 's', courseId: 'c', title: 'Counting', orderIndex: 0, createdAt: '', updatedAt: '',
      lessons: itemStatuses.map((s, i) => item({ id: `l${i}`, genStatus: s, minutes: 8, itemKind: 'notes' })) }],
    ...o,
  };
}

describe('unit minutes', () => {
  it('adds up item minutes per module and for the unit, ignoring items without minutes', () => {
    const tree = unit({});
    tree.modules[0].lessons.push(item({ minutes: null }));
    expect(moduleMinutes(tree.modules[0])).toBe(16);
    expect(unitMinutes(tree)).toBe(16);
  });

  it('reads as minutes, or hours and minutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(72)).toBe('1 h 12 min');
  });
});

describe('generationSummary', () => {
  it('says where the writing is, in plain words', () => {
    expect(generationSummary(gen({ status: 'queued', total: 12 }))).toEqual({ label: 'Waiting to start', percent: 0, active: true });
    expect(generationSummary(gen({ status: 'running', total: 12, done: 5 }))).toEqual({ label: 'Writing items: 5 of 12 ready', percent: 42, active: true });
    expect(generationSummary(gen({ status: 'done', total: 12, done: 12 }))).toEqual({ label: 'All 12 items ready', percent: 100, active: false });
    expect(generationSummary(gen({ status: 'done', total: 12, done: 11, failed: 1 }))).toEqual({ label: "11 of 12 ready · 1 couldn't be written", percent: 92, active: false });
    expect(generationSummary(gen({ status: 'failed', total: 3, failed: 3 }))).toEqual({ label: "The items couldn't be written", percent: 0, active: false });
    expect(generationSummary(undefined)).toBeNull();
    expect(generationSummary(gen({ status: 'idle' }))).toBeNull();
  });
});

describe('releaseBlocker', () => {
  it('says what stands between the unit and the class', () => {
    expect(releaseBlocker(unit({ outlineStatus: 'drafted' }))).toBe('Approve the outline first');
    expect(releaseBlocker(unit({}, ['ready', 'generating']))).toBe('Items are still being written');
    expect(releaseBlocker(unit({}, ['ready', 'failed']))).toBe('1 item needs attention');
    expect(releaseBlocker(unit({}, ['failed', 'failed']))).toBe('2 items need attention');
    expect(releaseBlocker(unit({}))).toBeNull();
  });
});

describe('labels and titles', () => {
  it('names item kinds and the default unit title', () => {
    expect(ITEM_KIND_LABEL).toEqual({ notes: 'Notes', worked_example: 'Worked example', quick_check: 'Quick check' });
    expect(defaultUnitTitle('Mathematics', 'Grade 1', 3)).toBe('Mathematics · Grade 1 · Term 3');
    expect(defaultUnitTitle('', 'Grade 1', 3)).toBe('Grade 1 · Term 3');
  });
});

describe('schoolTermFor', () => {
  it('defaults the form to the school term the date falls in', () => {
    expect(schoolTermFor(new Date(2026, 0, 20))).toBe(1);
    expect(schoolTermFor(new Date(2026, 4, 5))).toBe(2);
    expect(schoolTermFor(new Date(2026, 8, 24))).toBe(3);
    expect(schoolTermFor(new Date(2026, 10, 2))).toBe(4);
  });
});

describe('unitStage and unitChip', () => {
  it('knows where the unit is, and labels it for the teacher', () => {
    expect(unitStage(unit({ outlineStatus: 'none' }))).toBe('outline');
    expect(unitChip(unit({ outlineStatus: 'none' }))).toEqual({ status: 'draft', label: 'No outline yet' });
    expect(unitChip(unit({ outlineStatus: 'drafted' }))).toEqual({ status: 'draft', label: 'Outline to check' });
    const writing = unit({ generation: gen({ status: 'running', total: 2, done: 1 }) }, ['ready', 'generating']);
    expect(unitStage(writing)).toBe('writing');
    expect(unitChip(writing)).toEqual({ status: 'ai', label: 'Writing items' });
    expect(unitStage(unit({}))).toBe('release');
    expect(unitChip(unit({}))).toEqual({ status: 'due', label: 'Ready to release' });
    expect(unitChip(unit({}, ['ready', 'failed']))).toEqual({ status: 'overdue', label: 'Needs attention' });
    expect(unitStage(unit({ status: 'published' }))).toBe('released');
    expect(unitChip(unit({ status: 'published' }))).toEqual({ status: 'published', label: 'Released' });
  });
});

describe('liveGeneration', () => {
  it('counts from the items once writing is over, so removed items drop out', () => {
    const tree = unit({ generation: gen({ status: 'done', total: 3, done: 2, failed: 1 }) }, ['ready', 'ready']);
    expect(liveGeneration(tree)).toMatchObject({ status: 'done', total: 2, done: 2, failed: 0 });
  });

  it('keeps the server counts while items are being written', () => {
    const tree = unit({ generation: gen({ status: 'running', total: 3, done: 1 }) }, ['ready', 'generating', 'pending']);
    expect(liveGeneration(tree)).toMatchObject({ status: 'running', total: 3, done: 1 });
  });
});

describe('withPolledStatus', () => {
  it('shows each item as the latest poll has it, and the latest progress', () => {
    const tree = unit({ generation: gen({ status: 'running', total: 2, done: 0 }) }, ['pending', 'pending']);
    const next = withPolledStatus(tree, {
      outlineStatus: 'approved',
      generation: gen({ status: 'running', total: 2, done: 1 }),
      items: [{ id: 'l0', genStatus: 'ready', genError: '' }, { id: 'l1', genStatus: 'failed', genError: 'timeout' }],
    });
    expect(next.generation?.done).toBe(1);
    expect(next.modules[0].lessons.map((l) => [l.genStatus, l.genError ?? ''])).toEqual([['ready', ''], ['failed', 'timeout']]);
    expect(tree.modules[0].lessons[0].genStatus).toBe('pending');
    expect(withPolledStatus(tree, null)).toBe(tree);
  });
});
