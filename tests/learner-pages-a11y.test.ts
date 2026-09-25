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

describe('learner detail pages: named answer fields (final review, Important 1)', () => {
  it('names every typed homework answer', () => {
    const renderer = readSource('src/components/homework/ExerciseQuestionRenderer.tsx');
    const fields = renderer.match(/<(?:Input|Textarea)\b[\s\S]*?\/>/g) ?? [];
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) expect(field).toContain('aria-label=');
    const quiz = readSource('src/components/homework/QuizSubmissionForm.tsx').match(/<Input\b[\s\S]*?\/>/g) ?? [];
    for (const field of quiz) expect(field).toContain('aria-label=');
  });
});

describe('a code typed or pasted at sign-up (Review Focus 2)', () => {
  it('runs through codeFromSearch, with no length cap that would cut a pasted code with spaces', () => {
    const page = readSource('src/app/register-student/page.tsx');
    expect(page).toMatch(/e\.target\.value = codeFromSearch\(e\.target\.value\)/);
    expect(page).not.toMatch(/maxLength=\{6\}/);
  });
});

describe("no school wording for a standalone teacher's learners (spec intent)", () => {
  it("the tutor's message box does not say school", () => {
    expect(readSource('src/components/ai-tutor/ChatInterface.tsx')).not.toMatch(/school work/i);
  });
});

describe('learner pages: no sideways scroll', () => {
  it("wraps the tutor's subject, topic and mode chips on a phone instead of pushing past the edge", () => {
    expect(readSource('src/components/ai-tutor/AuraHeader.tsx')).toMatch(/<div className="flex min-w-0 flex-wrap items-center gap-2">/);
  });
});
