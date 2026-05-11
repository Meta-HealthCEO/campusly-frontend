'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useTeachingScope } from '@/hooks/useTeachingScope';
import { useCapsGrades, useCapsSubjects } from '@/hooks/useCapsGrades';
import type { CurriculumNodeItem, TeachingScope } from '@/types';

// ─── Chip ─────────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

function Chip({ label, selected, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted',
      )}
    >
      {selected && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

// ─── Subjects row (one per selected grade) ────────────────────────────────────

interface SubjectsRowProps {
  gradeId: string;
  gradeName: string;
  frameworkId: string;
  selectedSubjectIds: string[];
  onToggle: (subjectId: string) => void;
}

function SubjectsRow({ gradeId, gradeName, frameworkId, selectedSubjectIds, onToggle }: SubjectsRowProps) {
  const { subjects, loading } = useCapsSubjects(gradeId, frameworkId);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">{gradeName} — Subjects</h3>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading subjects…</p>
        ) : subjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">No subjects found for this grade.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s: CurriculumNodeItem) => (
              <Chip
                key={s.id}
                label={s.title}
                selected={selectedSubjectIds.includes(s.id)}
                onToggle={() => onToggle(s.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main picker ──────────────────────────────────────────────────────────────

export function TeachingScopePicker() {
  const { scope, loading: scopeLoading, save } = useTeachingScope();
  const { grades, frameworkId, loading: gradesLoading } = useCapsGrades();

  const [draft, setDraft] = useState<TeachingScope>(scope);
  useEffect(() => { setDraft(scope); }, [scope]);

  const [saving, setSaving] = useState(false);

  const toggleGrade = (gradeId: string) => {
    setDraft((d) => {
      const hasIt = d.grades.includes(gradeId);
      if (hasIt) {
        return {
          grades: d.grades.filter((g) => g !== gradeId),
          subjectsByGrade: d.subjectsByGrade.filter((s) => s.gradeId !== gradeId),
        };
      }
      return {
        grades: [...d.grades, gradeId],
        subjectsByGrade: [...d.subjectsByGrade, { gradeId, subjectIds: [] }],
      };
    });
  };

  const toggleSubject = (gradeId: string, subjectId: string) => {
    setDraft((d) => ({
      ...d,
      subjectsByGrade: d.subjectsByGrade.map((entry) => {
        if (entry.gradeId !== gradeId) return entry;
        const hasIt = entry.subjectIds.includes(subjectId);
        return {
          ...entry,
          subjectIds: hasIt
            ? entry.subjectIds.filter((s) => s !== subjectId)
            : [...entry.subjectIds, subjectId],
        };
      }),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await save(draft);
    setSaving(false);
    if (result) {
      toast.success('Teaching scope saved');
    } else {
      toast.error('Failed to save teaching scope');
    }
  };

  if (scopeLoading || gradesLoading) return <LoadingSpinner />;

  const gradeMap = Object.fromEntries(grades.map((g) => [g.id, g.title]));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Teaching Scope</p>
          <p className="text-xs text-muted-foreground">
            Pick the grades and subjects you teach. Dropdowns and AI tools will reflect this automatically.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="shrink-0">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save scope
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Grades</h3>
          {grades.length === 0 ? (
            <p className="text-xs text-muted-foreground">No CAPS grades found in curriculum tree.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {grades.map((g: CurriculumNodeItem) => (
                <Chip
                  key={g.id}
                  label={g.title}
                  selected={draft.grades.includes(g.id)}
                  onToggle={() => toggleGrade(g.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {draft.grades.map((gradeId) => {
        const entry = draft.subjectsByGrade.find((e) => e.gradeId === gradeId);
        return (
          <SubjectsRow
            key={gradeId}
            gradeId={gradeId}
            gradeName={gradeMap[gradeId] ?? gradeId}
            frameworkId={frameworkId}
            selectedSubjectIds={entry?.subjectIds ?? []}
            onToggle={(subjectId) => toggleSubject(gradeId, subjectId)}
          />
        );
      })}
    </div>
  );
}
