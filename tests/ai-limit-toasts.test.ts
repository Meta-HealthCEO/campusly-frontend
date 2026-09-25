import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * A refused AI action (402 AI_ALLOWANCE / 403 EMAIL_UNVERIFIED) opens the one
 * prompt from the API client. Hooks that call a counted AI endpoint must not
 * also show their own error toast for it, so each checks isAILimitError.
 */
const AI_HOOKS: Array<[hook: string, endpoint: string]> = [
  ['useAITools', "'/ai-tools/mark-paper'"],
  ['useReportComments', "'/ai-tutor/report-comments'"],
  ['useReportComments', '/regenerate`'],
  ['useTeacherMarking', "'/ai-tools/mark-paper-text'"],
  ['useTeacherMarkingBatch', "'/ai-tools/mark-batch'"],
  ['useTeacherPapers', '/generate`'],
  ['useTeacherAssignments', "'/assignments/generate'"],
  ['useTeacherHomeworkSubmissions', '/regrade`'],
  ['useComprehensionGenerator', "'/homework/comprehension-questions'"],
  ['useClassUnit', "'/courses/class-units'"],
];

/** The catch block of the call to `endpoint`: from the endpoint to the end of its catch body. */
function catchAfter(source: string, endpoint: string): string {
  const at = source.indexOf(endpoint);
  if (at < 0) throw new Error(`endpoint ${endpoint} not found`);
  const catchAt = source.indexOf('catch (err: unknown)', at);
  const end = source.indexOf('return', catchAt);
  return source.slice(catchAt, end);
}

describe('AI hooks leave a refused AI action to the one prompt', () => {
  it.each(AI_HOOKS)('%s skips its own toast for %s', (hook: string, endpoint: string) => {
    const source = readFileSync(`src/hooks/${hook}.ts`, 'utf8');
    expect(catchAfter(source, endpoint)).toContain('isAILimitError(err)');
  });
});
