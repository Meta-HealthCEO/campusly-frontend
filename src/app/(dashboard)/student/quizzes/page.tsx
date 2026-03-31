'use client';

import { useState, useEffect } from 'react';
import { FileQuestion, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useLearningStore } from '@/stores/useLearningStore';
import { QuizAttemptUI } from '@/components/learning/QuizAttemptUI';
import { getPopulatedName } from '@/components/learning/types';
import { useFetchQuiz } from '@/hooks/useStudentMaterials';
import type { Quiz, QuizAnswer, QuizAttempt } from '@/components/learning/types';
import { formatDate } from '@/lib/utils';

export default function StudentQuizzesPage() {
  const { quizzes, quizzesLoading, fetchQuizzes, submitQuizAttempt } = useLearningStore();
  const { fetchFullQuiz } = useFetchQuiz();
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    fetchQuizzes({ status: 'published' });
  }, [fetchQuizzes]);

  const handleSubmit = async (answers: QuizAnswer[], startedAt: string): Promise<QuizAttempt> => {
    if (!activeQuiz) throw new Error('No active quiz');
    const result = await submitQuizAttempt(activeQuiz.id, answers, startedAt);
    return result;
  };

  if (quizzesLoading) return <LoadingSpinner />;

  if (activeQuiz) {
    return (
      <div className="space-y-6">
        <PageHeader title={activeQuiz.title} description="Answer all questions and submit when ready.">
          <Button variant="outline" onClick={() => setActiveQuiz(null)}>Back to Quizzes</Button>
        </PageHeader>
        <QuizAttemptUI quiz={activeQuiz} onSubmit={handleSubmit} />
      </div>
    );
  }

  const published = quizzes.filter((q) => q.status === 'published');

  return (
    <div className="space-y-6">
      <PageHeader title="Quizzes" description="Take quizzes assigned to your class." />

      {published.length === 0 ? (
        <EmptyState icon={FileQuestion} title="No Quizzes Available" description="There are no published quizzes for you right now." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((quiz) => (
            <Card key={quiz.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{quiz.title}</CardTitle>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 shrink-0">
                    Published
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {quiz.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <FileQuestion className="h-3 w-3" />
                    {quiz.questions?.length ?? 0} questions
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Target className="h-3 w-3" />
                    {quiz.totalPoints} pts
                  </div>
                  {quiz.timeLimit && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {quiz.timeLimit} min
                    </div>
                  )}
                  {quiz.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Due: {formatDate(quiz.dueDate)}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Subject: {getPopulatedName(quiz.subjectId)} | Class: {getPopulatedName(quiz.classId)}
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={async () => {
                    const fullQuiz = await fetchFullQuiz(quiz.id);
                    setActiveQuiz(fullQuiz);
                  }}
                >
                  Start Quiz
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
