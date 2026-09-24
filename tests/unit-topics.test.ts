import { describe, it, expect } from 'vitest';
import { selectedTopics, topicWeeks, type UnitTopic } from '../src/hooks/useUnitTopics';

const topic = (id: string, o: Partial<UnitTopic> = {}): UnitTopic => ({ id, title: id, ...o });

describe('selectedTopics', () => {
  it('sends only the ticked topics, up to the cap', () => {
    const topics = ['a', 'b', 'c'].map((id) => topic(id));
    expect(selectedTopics(topics, new Set(), 8).map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(selectedTopics(topics, new Set(['b']), 8).map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('caps at max even when nothing was unticked, so a topic past the cap is never sent', () => {
    const topics = Array.from({ length: 10 }, (_, i) => topic(`t${i}`));
    const chosen = selectedTopics(topics, new Set(), 8);
    expect(chosen).toHaveLength(8);
    expect(chosen.map((t) => t.id)).toEqual(['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']);
  });
});

describe('topicWeeks', () => {
  it('reads a single week or a range', () => {
    expect(topicWeeks(topic('a', { metadata: { weekNumbers: [4] } }))).toBe('Week 4');
    expect(topicWeeks(topic('a', { metadata: { weekNumbers: [4, 5, 6] } }))).toBe('Weeks 4–6');
    expect(topicWeeks(topic('a'))).toBe('');
  });
});
