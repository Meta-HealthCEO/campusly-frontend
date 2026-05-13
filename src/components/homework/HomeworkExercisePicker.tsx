'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useQuestionBankLibrary } from '@/hooks/useQuestionBankLibrary';
import { ListChecks } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

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
  const { questions, loading } = useQuestionBankLibrary({
    subjectId,
    gradeId,
    curriculumNodeId,
    q: search,
  });

  const toggle = (id: string): void => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search questions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {questions.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title="No questions found"
          description={
            search.trim()
              ? 'Try a different search term, or add questions to the Question Bank.'
              : 'Add questions to the Question Bank to build exercise sets.'
          }
        />
      )}
      {questions.length > 0 && (
        <>
          <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
            {questions.map((q) => (
              <label
                key={q._id}
                className="flex items-start gap-2 p-2 cursor-pointer hover:bg-muted"
              >
                <Checkbox
                  checked={selectedIds.includes(q._id)}
                  onCheckedChange={() => toggle(q._id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm line-clamp-2">{q.stem}</div>
                  <div className="text-xs text-muted-foreground">{q.marks} pts</div>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: {selectedIds.length} question(s)
          </p>
        </>
      )}
      {questions.length === 0 && !search.trim() && (
        <Link
          href="/teacher/curriculum/questions"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Add questions <ExternalLink className="ml-1 h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
