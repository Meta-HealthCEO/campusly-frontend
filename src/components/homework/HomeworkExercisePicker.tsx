'use client';
import { useState } from 'react';
import { ListChecks, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { DraftHomeworkWithAIDialog } from '@/components/homework/DraftHomeworkWithAIDialog';
import { useQuestionBankLibrary } from '@/hooks/useQuestionBankLibrary';
import { draftBlockedReason } from '@/lib/homework-ai-draft';

interface Props {
  subjectId: string;
  gradeId: string;
  curriculumNodeId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function HomeworkExercisePicker({
  subjectId,
  gradeId,
  curriculumNodeId,
  selectedIds,
  onChange,
}: Props) {
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [drafting, setDrafting] = useState(false);
  const { questions, loading } = useQuestionBankLibrary({
    subjectId,
    gradeId,
    curriculumNodeId,
    q: search,
    refreshKey,
  });
  const blocked = draftBlockedReason({ subjectId, gradeId, curriculumNodeId });

  const toggle = (id: string): void => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const added = (ids: string[]): void => {
    onChange([...selectedIds, ...ids.filter((id: string) => !selectedIds.includes(id))]);
    setRefreshKey((k: number) => k + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:flex-1"
        />
        <Button
          variant="outline"
          onClick={() => setDrafting(true)}
          disabled={blocked !== null}
          title={blocked ?? undefined}
          className="min-h-11 gap-1.5 sm:min-h-9"
        >
          <Sparkles className="h-4 w-4 text-accent-foreground" aria-hidden /> Draft with AI
        </Button>
      </div>
      {blocked ? <p className="text-xs text-muted-foreground">{blocked}</p> : null}

      {loading ? <LoadingSpinner /> : null}
      {!loading && questions.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title="No questions found"
          description={
            search.trim()
              ? 'Try a different search term, or draft fresh questions with AI.'
              : 'No saved questions for this topic yet. Draft some with AI.'
          }
        />
      )}
      {!loading && questions.length > 0 && (
        <>
          <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {questions.map((q) => (
              <label
                key={q._id}
                className="flex cursor-pointer items-start gap-2 p-2 hover:bg-muted"
              >
                <Checkbox
                  checked={selectedIds.includes(q._id)}
                  onCheckedChange={() => toggle(q._id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm">{q.stem}</div>
                  <div className="font-mono text-xs tabular-nums text-muted-foreground">{q.marks} pts</div>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-mono tabular-nums">{selectedIds.length}</span> question(s)
          </p>
        </>
      )}

      {curriculumNodeId ? (
        <DraftHomeworkWithAIDialog
          open={drafting}
          onOpenChange={setDrafting}
          scope={{ subjectId, gradeId, curriculumNodeId }}
          onAdded={added}
        />
      ) : null}
    </div>
  );
}
