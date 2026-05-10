'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, RotateCw } from 'lucide-react';
import type {
  ScaffoldedOutline,
  LessonPhase,
  LessonMaterialKind,
} from '@/types/lesson';
import { LESSON_PHASES } from '@/types/lesson';

interface Props {
  outline: ScaffoldedOutline;
  onChange: (outline: ScaffoldedOutline) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

const PHASE_LABELS: Record<LessonPhase, string> = {
  introduction: 'Introduction',
  direct_instruction: 'Direct Instruction',
  practice: 'Practice',
  assessment: 'Assessment',
  homework: 'Homework',
};

const MAX_OBJECTIVES = 10;

export function LessonScaffoldPreview({
  outline,
  onChange,
  onRegenerate,
  regenerating,
}: Props) {
  // ─── Objectives ──────────────────────────────────────────────────────────
  const updateObjective = (index: number, value: string) => {
    const next = [...outline.objectives];
    next[index] = value;
    onChange({ ...outline, objectives: next });
  };

  const addObjective = () => {
    if (outline.objectives.length >= MAX_OBJECTIVES) return;
    onChange({ ...outline, objectives: [...outline.objectives, ''] });
  };

  const removeObjective = (index: number) => {
    const next = outline.objectives.filter((_, i) => i !== index);
    onChange({ ...outline, objectives: next });
  };

  // ─── Phases / Suggestions ────────────────────────────────────────────────
  const updateSuggestionTitle = (
    phase: LessonPhase,
    suggestionIndex: number,
    title: string,
  ) => {
    const nextPhases = outline.phases.map((p) => {
      if (p.phase !== phase) return p;
      const suggestions = p.suggestions.map((s, i) =>
        i === suggestionIndex ? { ...s, title } : s,
      );
      return { ...p, suggestions };
    });
    onChange({ ...outline, phases: nextPhases });
  };

  const removeSuggestion = (phase: LessonPhase, suggestionIndex: number) => {
    const nextPhases = outline.phases.map((p) => {
      if (p.phase !== phase) return p;
      return {
        ...p,
        suggestions: p.suggestions.filter((_, i) => i !== suggestionIndex),
      };
    });
    onChange({ ...outline, phases: nextPhases });
  };

  // Render in canonical phase order (use LESSON_PHASES, fall back to outline.phases)
  const phaseEntries = LESSON_PHASES.map((phase) => {
    const entry = outline.phases.find((p) => p.phase === phase);
    return {
      phase,
      suggestions: entry?.suggestions ?? [],
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI-suggested outline</h2>
          <p className="text-sm text-muted-foreground">
            Edit anything below before creating the lesson.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={regenerating}
        >
          <RotateCw className={`h-4 w-4 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerating...' : 'Regenerate'}
        </Button>
      </div>

      {/* Objectives */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Learning Objectives</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={addObjective}
            disabled={outline.objectives.length >= MAX_OBJECTIVES}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {outline.objectives.length === 0 ? (
          <p className="text-xs text-muted-foreground">No objectives yet — add one.</p>
        ) : (
          <ul className="space-y-2">
            {outline.objectives.map((obj, i) => (
              <li key={i} className="flex gap-2 items-center">
                <Input
                  value={obj}
                  onChange={(e) => updateObjective(i, e.target.value)}
                  placeholder={`Objective ${i + 1}`}
                  className="w-full"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeObjective(i)}
                  aria-label="Remove objective"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Phase suggestions */}
      <div className="space-y-4">
        {phaseEntries.map(({ phase, suggestions }) => (
          <PhaseSection
            key={phase}
            label={PHASE_LABELS[phase]}
            suggestions={suggestions}
            onUpdateTitle={(i, t) => updateSuggestionTitle(phase, i, t)}
            onRemove={(i) => removeSuggestion(phase, i)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Phase section sub-component ───────────────────────────────────────────

interface PhaseSectionProps {
  label: string;
  suggestions: Array<{ kind: LessonMaterialKind; title: string; notes?: string }>;
  onUpdateTitle: (index: number, title: string) => void;
  onRemove: (index: number) => void;
}

function PhaseSection({ label, suggestions, onUpdateTitle, onRemove }: PhaseSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="text-xs text-muted-foreground">
          {suggestions.length} item{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>
      {suggestions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No suggestions for this phase.</p>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <Card key={i} className="p-3 flex gap-2 items-start">
              <div className="flex-1 min-w-0 space-y-1">
                <Input
                  value={s.title}
                  onChange={(e) => onUpdateTitle(i, e.target.value)}
                  className="w-full"
                />
                {s.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.notes}</p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {s.kind.replace('_', ' ')}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(i)}
                aria-label="Remove suggestion"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
