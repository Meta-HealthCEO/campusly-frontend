import type { CourseTree, GenerationState, ItemGenStatus, ItemKind, OutlineStatus } from '@/types/courses';
import type { ChipStatus } from '@/lib/status-chip';

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

/** The school term a date falls in (South African terms run roughly by quarter); a form default only. */
export function schoolTermFor(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

export type UnitStage = 'outline' | 'writing' | 'release' | 'released';

/** Where a unit is: its outline to draft or check, items being written, ready to release, or released. */
export function unitStage(course: CourseTree): UnitStage {
  if (course.status === 'published') return 'released';
  if (course.outlineStatus !== 'approved') return 'outline';
  const writing = course.generation?.status === 'queued' || course.generation?.status === 'running'
    || course.modules.some((m) => m.lessons.some((l) => l.genStatus === 'pending' || l.genStatus === 'generating'));
  return writing ? 'writing' : 'release';
}

/** The unit's status chip. */
export function unitChip(course: CourseTree): { status: ChipStatus; label: string } {
  switch (unitStage(course)) {
    case 'released':
      return { status: 'published', label: 'Released' };
    case 'writing':
      return { status: 'ai', label: 'Writing items' };
    case 'release':
      return releaseBlocker(course) ? { status: 'overdue', label: 'Needs attention' } : { status: 'due', label: 'Ready to release' };
    default:
      return { status: 'draft', label: course.outlineStatus === 'drafted' ? 'Outline to check' : 'No outline yet' };
  }
}

/**
 * The unit's writing state, recounted from its items once writing is over, so
 * an item the teacher removed no longer counts as failed.
 */
export function liveGeneration(course: CourseTree): GenerationState | undefined {
  const g = course.generation;
  if (!g || g.status === 'queued' || g.status === 'running') return g;
  const items = course.modules.flatMap((m) => m.lessons).filter((l) => l.genStatus);
  if (items.length === 0) return g;
  const done = items.filter((l) => l.genStatus === 'ready').length;
  const failed = items.filter((l) => l.genStatus === 'failed').length;
  return { ...g, total: items.length, done, failed, status: failed === items.length ? 'failed' : 'done' };
}

export interface PolledState {
  outlineStatus: OutlineStatus;
  generation: GenerationState;
  items: Array<{ id: string; genStatus: ItemGenStatus | null; genError: string }>;
}

/** The unit as the latest progress poll has it (a new tree; the original is left alone). */
export function withPolledStatus(course: CourseTree, poll: PolledState | null): CourseTree {
  if (!poll) return course;
  const byId = new Map(poll.items.map((i) => [i.id, i]));
  return {
    ...course,
    outlineStatus: poll.outlineStatus,
    generation: poll.generation,
    modules: course.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => {
        const polled = byId.get(l.id);
        return polled ? { ...l, genStatus: polled.genStatus, genError: polled.genError } : l;
      }),
    })),
  };
}
