import { describe, expect, it } from 'vitest';
import { examMapLabel, layoutExamMap, topicsByGain, totalMarksToGain, type ExamTopic } from '../src/lib/readiness/exam-map';
import { EXAMPLE_READINESS } from '../src/lib/readiness/example-data';

const t = (id: string, section: string, marks: number, mastery: number | null): ExamTopic => ({ id, name: id, section, marks, mastery });

describe('layoutExamMap', () => {
  it('groups topics into rows by paper section, in the order sections first appear', () => {
    const rows = layoutExamMap([t('fn', 'A', 35, 49), t('alg', 'B', 25, 78), t('calc', 'A', 35, 52)]);
    expect(rows.map((r) => [r.section, r.marks, r.tiles.map((x) => x.id)])).toEqual([['A', 70, ['fn', 'calc']], ['B', 25, ['alg']]]);
  });

  it('colours each tile with masteryLevel and works out its marks to gain', () => {
    const [row] = layoutExamMap([t('fn', 'A', 35, 49), t('prob', 'A', 15, 64), t('fin', 'A', 15, 82)]);
    expect(row.tiles.map((x) => [x.level, x.marksToGain])).toEqual([['weak', 17.9], ['building', 5.4], ['secure', 2.7]]);
  });

  it('shows a topic with no evidence as untested, not weak', () => {
    const [row] = layoutExamMap([t('new', 'A', 20, null)]);
    expect(row.tiles[0]).toMatchObject({ level: 'untested', marksToGain: null, mastery: null });
  });

  it('leaves out topics worth no marks, and a section left empty', () => {
    expect(layoutExamMap([t('x', 'A', 0, 50), t('y', 'B', -2, 50), t('z', 'B', Number.NaN, 50)])).toEqual([]);
  });

  it('is empty for an empty blueprint', () => {
    expect(layoutExamMap([])).toEqual([]);
  });
});

describe('examMapLabel', () => {
  it('says the size of the paper and how the learner stands (the mockup)', () => {
    expect(examMapLabel('Paper 1', layoutExamMap(EXAMPLE_READINESS.topics))).toBe('Paper 1: 150 marks in 6 topics; 2 weak, 1 building, 3 secure');
  });

  it('handles one untested topic', () => {
    expect(examMapLabel('Paper 2', layoutExamMap([t('a', 'A', 10, null)]))).toBe('Paper 2: 10 marks in 1 topic; 1 not yet tested');
  });
});

describe('marks at stake', () => {
  it('totals 56 of 150 in the mockup', () => {
    expect(totalMarksToGain(layoutExamMap(EXAMPLE_READINESS.topics))).toBe(56);
  });

  it('orders topics by marks to gain, most first, untested last', () => {
    const rows = layoutExamMap([t('a', 'A', 10, 90), t('b', 'A', 30, 40), t('c', 'B', 50, null), t('d', 'B', 20, 50)]);
    expect(topicsByGain(rows).map((x) => x.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});
