'use client';
import { useTeacherQuizzes } from '@/hooks/useTeacherQuizzes';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';

interface Props {
  subjectId: string;
  classId: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function QuizPicker({ subjectId, classId, selectedId, onSelect }: Props) {
  const { quizzes, loading } = useTeacherQuizzes({ subjectId, classId });

  if (loading) return <LoadingSpinner />;

  if (quizzes.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No quizzes yet"
        description="Create one in the Learning module first."
      />
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {quizzes.map((q) => (
        <button
          key={q._id}
          type="button"
          onClick={() => onSelect(q._id)}
          className={`text-left transition-colors hover:opacity-80 ${
            selectedId === q._id ? 'ring-2 ring-primary rounded-lg' : ''
          }`}
        >
          <Card>
            <CardContent className="p-3">
              <div className="font-medium text-sm truncate">{q.title}</div>
              <div className="text-xs text-muted-foreground">{q.totalPoints} marks</div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
