'use client';

import { useState, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAIPractice } from '@/hooks/useAIPractice';
import { useSubjects } from '@/hooks/useAcademics';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PracticeSetup } from '@/components/ai-tutor/PracticeSetup';
import { PracticeQuestionCard } from '@/components/ai-tutor/PracticeQuestionCard';
import { PracticeResults } from '@/components/ai-tutor/PracticeResults';
import { Button } from '@/components/ui/button';
import type { PracticeQuestion } from '@/types';

export default function PracticePage() {
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get('subjectId') ?? '';
  const initialTopic = searchParams.get('topic') ?? '';
  const { student, loading: studentLoading } = useCurrentStudent();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const {
    currentAttempt,
    generating,
    submitting,
    generatePractice,
    submitPractice,
    resetAttempt,
  } = useAIPractice();

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = useCallback((index: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [index]: answer }));
  }, []);

  const handleSubmit = async () => {
    if (!currentAttempt) return;
    const answerList = Object.entries(answers).map(([idx, answer]) => ({
      questionIndex: Number(idx),
      answer,
    }));
    const result = await submitPractice({
      attemptId: currentAttempt.id,
      answers: answerList,
    });
    if (result) setSubmitted(true);
  };

  const handleReset = () => {
    resetAttempt();
    setAnswers({});
    setSubmitted(false);
  };

  if (studentLoading || subjectsLoading) return <LoadingSpinner />;

  if (!student) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Student profile not found"
        description="We could not locate your student record."
      />
    );
  }

  const grade = student.grade?.level ?? 0;
  const questions: PracticeQuestion[] = currentAttempt?.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i]);

  return (
    <div className="space-y-6">
      <PageHeader title="Practice Questions" description="Generate and answer practice questions">
        <div className="flex items-center gap-2">
          <Link href="/student/ai-tutor/practice/history">
            <Button variant="outline">History</Button>
          </Link>
          <Link href="/student/ai-tutor">
            <Button variant="outline">Back to AI Tutor</Button>
          </Link>
        </div>
      </PageHeader>

      {!currentAttempt && (
        <PracticeSetup
          onGenerate={generatePractice}
          generating={generating}
          subjects={subjects}
          grade={grade}
          initialSubjectId={initialSubjectId || undefined}
          initialTopic={initialTopic || undefined}
        />
      )}

      {currentAttempt && !submitted && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <PracticeQuestionCard
              key={i}
              question={{ ...q, studentAnswer: answers[i] ?? q.studentAnswer }}
              index={i}
              onAnswer={handleAnswer}
              showResult={false}
            />
          ))}
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
              {submitting ? 'Submitting...' : 'Submit Answers'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {currentAttempt && submitted && (
        <div className="space-y-4">
          <PracticeResults attempt={currentAttempt} />
          {currentAttempt.questions.map((q, i) => (
            <PracticeQuestionCard
              key={i}
              question={q}
              index={i}
              onAnswer={() => {}}
              showResult
            />
          ))}
          <Button onClick={handleReset}>Try Again</Button>
        </div>
      )}
    </div>
  );
}
