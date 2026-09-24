import type { CourseTree, GenerationState, ItemKind } from '@/types/courses';

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  notes: 'Notes',
  worked_example: 'Worked example',
  quick_check: 'Quick check',
};

type ModuleLike = { lessons: Array<{ minutes?: number | null }> };

export function moduleMinutes(module: ModuleLike): number {
  return module.lessons.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
}

export function unitMinutes(course: { modules: ModuleLike[] }): number {
  return course.modules.reduce((sum, m) => sum + moduleMinutes(m), 0);
}

/** 45 → "45 min", 72 → "1 h 12 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export interface GenerationSummary {
  label: string;
  percent: number;
  /** Still writing: keep polling. */
  active: boolean;
}

/** Where the writing of a unit's items has got to, in plain words; null before it starts. */
export function generationSummary(g: GenerationState | undefined): GenerationSummary | null {
  if (!g || g.status === 'idle') return null;
  const percent = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
  switch (g.status) {
    case 'queued':
      return { label: 'Waiting to start', percent, active: true };
    case 'running':
      return { label: `Writing items: ${g.done} of ${g.total} ready`, percent, active: true };
    case 'failed':
      return { label: "The items couldn't be written", percent, active: false };
    default:
      return g.failed > 0
        ? { label: `${g.done} of ${g.total} ready · ${g.failed} couldn't be written`, percent, active: false }
        : { label: `All ${g.total} items ready`, percent: 100, active: false };
  }
}

/** Why the unit can't be released to a class yet, or null when it can. */
export function releaseBlocker(course: CourseTree): string | null {
  if (course.outlineStatus !== 'approved') return 'Approve the outline first';
  const items = course.modules.flatMap((m) => m.lessons).filter((l) => l.genStatus !== undefined && l.genStatus !== null);
  if (items.some((l) => l.genStatus === 'pending' || l.genStatus === 'generating')) return 'Items are still being written';
  const failed = items.filter((l) => l.genStatus === 'failed').length;
  if (failed > 0) return `${failed} item${failed === 1 ? '' : 's'} need${failed === 1 ? 's' : ''} attention`;
  return null;
}

export function defaultUnitTitle(subjectName: string, gradeName: string, termNumber: number): string {
  return [subjectName, gradeName, `Term ${termNumber}`].filter(Boolean).join(' · ');
}
