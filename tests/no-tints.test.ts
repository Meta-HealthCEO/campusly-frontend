import { describe, expect, it } from 'vitest';
import { findTints } from '../src/lib/design/palette-scan';
import { listSourceFiles, readSource } from './support/source';

/**
 * Orchestrator ruling O1 (revised): colour lives only in solid marks; every surface is neutral.
 * The Blueprint components and the pages this phase swept carry no see-through colour fills.
 */
const BLUEPRINT = [
  'src/components/ui', 'src/components/shared', 'src/components/layout', 'src/components/readiness',
  'src/components/design-gallery', 'src/components/auth', 'src/components/subscription', 'src/components/notifications',
].flatMap((dir: string) => listSourceFiles(dir));
const SWEPT = ['src/app/page.tsx', 'src/app/login/page.tsx', 'src/app/register-student/page.tsx'];

describe('no tinted surfaces', () => {
  it('reaches the component folders', () => {
    expect(BLUEPRINT.length).toBeGreaterThan(100);
  });

  it.each([...BLUEPRINT, ...SWEPT])('%s has none', (file) => {
    expect(findTints(readSource(file))).toEqual([]);
  });
});
