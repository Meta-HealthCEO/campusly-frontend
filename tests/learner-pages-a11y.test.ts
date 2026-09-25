import { describe, expect, it } from 'vitest';
import { readSource } from './support/source';

/**
 * Faults the design gate's learner passes found on learner pages (school and standalone learners alike):
 * each control is named, and nothing scrolls sideways at 320px.
 */
describe('learner pages: named controls', () => {
  it('names the tutor message box and its send button', () => {
    const input = readSource('src/components/ai-tutor/ChatInput.tsx');
    expect(input).toContain('aria-label="Message"');
    expect(input).toContain('aria-label="Send message"');
  });

  it('ties the practice set-up labels to their fields', () => {
    const setup = readSource('src/components/ai-tutor/PracticeSetup.tsx');
    for (const id of ['practice-subject', 'practice-topic', 'practice-count']) {
      expect(setup, id).toContain(`htmlFor="${id}"`);
      expect(setup, id).toContain(`id="${id}"`);
    }
  });

  it("labels the school learner's join-code field", () => {
    const card = readSource('src/components/student/JoinClassCard.tsx');
    expect(card).toContain('htmlFor="join-class-code"');
    expect(card).toContain('id="join-class-code"');
  });
});

describe('learner pages: no sideways scroll', () => {
  it("wraps the tutor's subject, topic and mode chips on a phone instead of pushing past the edge", () => {
    expect(readSource('src/components/ai-tutor/AuraHeader.tsx')).toMatch(/<div className="flex min-w-0 flex-wrap items-center gap-2">/);
  });
});
