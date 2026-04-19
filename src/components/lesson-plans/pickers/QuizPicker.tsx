'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuizLibrary } from '@/hooks/useQuizLibrary';
import type { StagedQuizHomework } from '@/types';

interface QuizPickerProps {
  classId: string;
  subjectId: string;
  schoolId: string;
  initialTitle?: string;
  onPicked: (hw: StagedQuizHomework) => void;
}

export function QuizPicker({
  classId,
  subjectId,
  schoolId,
  initialTitle,
  onPicked,
}: QuizPickerProps) {
  const { quizzes, loading } = useQuizLibrary({ classId, subjectId });
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [title, setTitle] = useState<string>(initialTitle ?? '');
  const [dueDate, setDueDate] = useState<string>('');

  const selectedQuiz = quizzes.find((q) => q._id === selectedQuizId);
  const canSubmit = Boolean(selectedQuizId && title.trim() && dueDate);

  const handleSubmit = (): void => {
    if (!selectedQuiz) return;
    onPicked({
      type: 'quiz',
      quizId: selectedQuiz._id,
      title: title.trim(),
      schoolId,
      subjectId,
      classId,
      dueDate: new Date(dueDate).toISOString(),
      totalMarks: selectedQuiz.totalPoints,
    });
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading quizzes...</p>
    );
  }

  if (quizzes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No quizzes available for this class and subject yet. Create a quiz in
        the Learning module first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>
          Quiz <span className="text-destructive">*</span>
        </Label>
        <div className="max-h-48 overflow-y-auto rounded-md border">
          {quizzes.map((q) => (
            <button
              type="button"
              key={q._id}
              onClick={() => setSelectedQuizId(q._id)}
              className={`w-full text-left px-3 py-2 hover:bg-muted ${
                selectedQuizId === q._id ? 'bg-muted' : ''
              }`}
            >
              <div className="font-medium truncate">{q.title}</div>
              <div className="text-xs text-muted-foreground">
                {q.totalPoints} pts
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quiz-hw-title">
          Homework Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="quiz-hw-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Week 3 Quiz"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="quiz-hw-due">
          Due Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="quiz-hw-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Total marks: {selectedQuiz?.totalPoints ?? '—'} (from quiz)
      </p>

      <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
        Add Quiz Homework
      </Button>
    </div>
  );
}
