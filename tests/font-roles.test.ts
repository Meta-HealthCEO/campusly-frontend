import { describe, expect, it } from 'vitest';
import { importClosure } from './support/import-closure';
import { DESIGN_SCOPE } from './support/design-scope';
import { listSourceFiles, readSource } from './support/source';

/**
 * Final review finding 2: `font-mono` is a true monospace again, so it is only for code, identifiers, credentials and
 * join codes. Figures use `font-heading tabular-nums` (Hanken Grotesk's tabular numerals); labels use `font-heading`.
 */
const MONO_ALLOWED = new Set([
  'src/app/register-student/page.tsx', // classroom code input
  'src/app/(dashboard)/teacher/assignments/new/_StepSetup.tsx', // authoring textarea
  'src/app/(dashboard)/teacher/settings/join-school/page.tsx', // join code input
  'src/app/(dashboard)/teacher/students/[id]/credentials/print/page.tsx', // login URL, email, password
  'src/components/classes/StudentCredentialsPanel.tsx', // login email, password
  'src/components/content/renderers/CodeBlock.tsx', // code
  'src/components/content/renderers/TextBlock.tsx', // inline code
  'src/components/shared/MarkdownView.tsx', // inline code
  'src/components/courses/unit/NotesEditor.tsx', // markdown source
  'src/components/homework/MarkSubmissionDialog.tsx', // mark entry field
  'src/components/reports/ReportCardPanel.tsx', // year entry field
  'src/components/shared/ClassroomCodeCard.tsx', // join code (the launch e2e reads `.font-mono.text-primary`)
  'src/components/shared/JoinCodeCard.tsx', // join code
  'src/components/subscription/InvoicesTable.tsx', // invoice numbers
]);

const FILES = [...new Set([
  ...importClosure(DESIGN_SCOPE['landing+auth']), ...importClosure(DESIGN_SCOPE.shell), ...importClosure(DESIGN_SCOPE['teacher pages']),
  ...['src/components/ui', 'src/components/shared', 'src/components/layout', 'src/components/readiness', 'src/components/design-gallery']
    .flatMap((dir: string) => listSourceFiles(dir)),
])].sort();

describe('font roles (final review finding 2)', () => {
  it.each(FILES.filter((f: string) => !MONO_ALLOWED.has(f)))('%s uses no monospace for figures or labels', (file) => {
    expect(readSource(file).match(/\bfont-mono\b/g) ?? []).toEqual([]);
  });

  it('the join code keeps the classes the launch walkthrough reads', () => {
    expect(readSource('src/components/shared/ClassroomCodeCard.tsx')).toMatch(/font-mono[^"]*text-primary/);
  });
});
