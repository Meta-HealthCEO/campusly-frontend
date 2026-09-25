'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurriculumTree } from '@/hooks/useCurriculumTree';
import { compareGradeNodes } from '@/lib/teaching-scope';
import { displayNodeTitle } from '@/lib/curriculum-display';
import { phaseRank, type GradePick } from '@/lib/onboarding';
import { cn } from '@/lib/utils';
import type { CurriculumNodeItem } from '@/types';

interface CapsScopePickerProps {
  frameworkId: string;
  picks: GradePick[];
  onChange: (next: GradePick[]) => void;
}

const ofType = (nodes: CurriculumNodeItem[] | undefined, type: string): CurriculumNodeItem[] =>
  (nodes ?? []).filter((n: CurriculumNodeItem) => n.type === type);

/** Phase → grades → subjects, straight from the CAPS tree. */
export function CapsScopePicker({ frameworkId, picks, onChange }: CapsScopePickerProps) {
  const { getChildren, fetchChildren, isLoading } = useCurriculumTree(frameworkId);
  const [phaseId, setPhaseId] = useState<string | null>(null);

  const phases = useMemo(
    () => ofType(getChildren(null), 'phase').sort((a, b) => phaseRank(a.title) - phaseRank(b.title)),
    [getChildren],
  );
  const activePhase = phaseId ?? phases[0]?.id ?? null;
  const grades = useMemo(
    () => (activePhase ? ofType(getChildren(activePhase), 'grade').sort(compareGradeNodes) : []),
    [activePhase, getChildren],
  );
  const gradeTitles = useMemo(() => {
    const titles = new Map<string, string>();
    for (const phase of phases) {
      for (const g of ofType(getChildren(phase.id), 'grade')) titles.set(g.id, displayNodeTitle(g));
    }
    return titles;
  }, [phases, getChildren]);

  useEffect(() => { void fetchChildren(null); }, [fetchChildren]);
  useEffect(() => { if (activePhase) void fetchChildren(activePhase); }, [activePhase, fetchChildren]);
  useEffect(() => {
    for (const p of picks) void fetchChildren(p.gradeId);
  }, [picks, fetchChildren]);

  const pickedGrade = (gradeId: string): GradePick | undefined => picks.find((p: GradePick) => p.gradeId === gradeId);

  const toggleGrade = (gradeId: string): void => {
    onChange(pickedGrade(gradeId)
      ? picks.filter((p: GradePick) => p.gradeId !== gradeId)
      : [...picks, { gradeId, subjectIds: [] }]);
  };

  const toggleSubject = (gradeId: string, subjectId: string): void => {
    onChange(picks.map((p: GradePick) => {
      if (p.gradeId !== gradeId) return p;
      const on = p.subjectIds.includes(subjectId);
      return { ...p, subjectIds: on ? p.subjectIds.filter((s: string) => s !== subjectId) : [...p.subjectIds, subjectId] };
    }));
  };

  if (isLoading(null) && phases.length === 0) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the CAPS curriculum…</p>;
  }
  if (phases.length === 0) {
    return <p className="text-sm text-muted-foreground">The CAPS curriculum isn&apos;t loaded yet. Try again in a minute.</p>;
  }

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Phase" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {phases.map((phase: CurriculumNodeItem) => (
          <button
            key={phase.id}
            type="button"
            role="tab"
            aria-selected={phase.id === activePhase}
            onClick={() => setPhaseId(phase.id)}
            className={cn(
              'min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors',
              phase.id === activePhase ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted',
            )}
          >
            {phase.title.replace(/ phase$/i, '')}
          </button>
        ))}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Grades you teach</legend>
        {activePhase && isLoading(activePhase) && grades.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading grades…</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {grades.map((g: CurriculumNodeItem) => (
              <label key={g.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 hover:bg-muted/50">
                <Checkbox checked={Boolean(pickedGrade(g.id))} onCheckedChange={() => toggleGrade(g.id)} />
                <span className="text-sm">{displayNodeTitle(g)}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {picks.map((p: GradePick) => {
        const subjects = ofType(getChildren(p.gradeId), 'subject');
        return (
          <fieldset key={p.gradeId} className="space-y-2 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-medium">{gradeTitles.get(p.gradeId) ?? 'Grade'} subjects</legend>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isLoading(p.gradeId) ? 'Loading subjects…' : 'No subjects found for this grade.'}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s: CurriculumNodeItem) => {
                  const on = p.subjectIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSubject(p.gradeId, s.id)}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted',
                      )}
                    >
                      {on ? <Check className="h-4 w-4" aria-hidden /> : null}
                      {displayNodeTitle(s)}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
