'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardList, History, Loader2 } from 'lucide-react';
import { useAIPractice } from '@/hooks/useAIPractice';
import { useSubjects } from '@/hooks/useAcademics';
import { useCapsGrades, useCapsSubjects } from '@/hooks/useCapsGrades';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentClasses } from '@/hooks/useStudentClasses';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PracticeSetup } from '@/components/ai-tutor/PracticeSetup';
import { PracticeQuestionCard } from '@/components/ai-tutor/PracticeQuestionCard';
import { PracticeResults, buildAuraReviewHref } from '@/components/ai-tutor/PracticeResults';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  buildTutorSubjects,
  curriculumSubjectsToTutorSubjects,
  findCurriculumGradeNodeId,
} from '@/lib/ai-tutor-subjects';
import { resolveGradeId, resolveGradeLevel } from '@/lib/student-helpers';
import type { PracticeQuestion } from '@/types';

export default function PracticePage() {
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get('subjectId') ?? '';
  const initialTopic = searchParams.get('topic') ?? '';
  const { student, loading: studentLoading } = useCurrentStudent();
  const { homeroom, subjectClasses, loading: classesLoading } = useStudentClasses();
  const gradeSourceClass = homeroom ?? subjectClasses[0] ?? null;
  const studentGradeId = resolveGradeId(student, gradeSourceClass);
  const gradeLevel = resolveGradeLevel(student, gradeSourceClass);
  const { subjects, loading: subjectsLoading } = useSubjects(studentGradeId);
  const { grades: capsGrades, frameworkId, loading: capsGradesLoading } = useCapsGrades();
  const capsGradeNodeId = useMemo(
    () => findCurriculumGradeNodeId(capsGrades, gradeLevel),
    [capsGrades, gradeLevel],
  );
  const { subjects: capsSubjects, loading: capsSubjectsLoading } = useCapsSubjects(capsGradeNodeId, frameworkId);
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const tutorSubjects = useMemo(() => {
    const curriculumSubjects = curriculumSubjectsToTutorSubjects(capsSubjects);
    const subjectSource = curriculumSubjects.length > 0 ? curriculumSubjects : subjects;
    return buildTutorSubjects(subjectSource, homeroom, subjectClasses, initialSubjectId);
  }, [capsSubjects, homeroom, initialSubjectId, subjectClasses, subjects]);

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
    setCurrentIndex(0);
  };

  if (studentLoading || subjectsLoading || classesLoading || capsGradesLoading || capsSubjectsLoading) {
    return <LoadingSpinner />;
  }

  if (!student) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Student profile not found"
        description="We could not locate your student record."
      />
    );
  }

  const grade = gradeLevel;
  const questions: PracticeQuestion[] = currentAttempt?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((_, i) => answers[i]?.trim()).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < questions.length - 1;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/student/ai-tutor"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Aura
        </Link>
        <Link href="/student/ai-tutor/practice/history">
          <Button variant="outline">
            <History className="h-4 w-4" />
            History
          </Button>
        </Link>
      </div>

      {!currentAttempt && (
        <PracticeSetup
          onGenerate={generatePractice}
          generating={generating}
          subjects={tutorSubjects}
          grade={grade}
          initialSubjectId={initialSubjectId || undefined}
          initialTopic={initialTopic || undefined}
        />
      )}

      {currentAttempt && !submitted && (
        <div className="space-y-4">
          <section className="sticky top-0 z-10 rounded-lg border bg-card/95 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge className="mb-2 bg-primary text-primary-foreground">
                  <ClipboardList className="h-3 w-3" />
                  Practice drill
                </Badge>
                <h1 className="text-xl font-bold tracking-normal">{currentAttempt.topic}</h1>
                <p className="text-sm text-muted-foreground">
                  One question at a time. Aura marks everything when you submit.
                </p>
              </div>
              <div className="min-w-[220px] space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{answeredCount}/{questions.length} answered</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </div>
          </section>

          {currentQuestion && (
            <PracticeQuestionCard
              key={currentIndex}
              question={{ ...currentQuestion, studentAnswer: answers[currentIndex] ?? currentQuestion.studentAnswer }}
              index={currentIndex}
              onAnswer={handleAnswer}
              showResult={false}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!canGoBack}
                onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canGoNext}
                onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}
              >
                Next question
              </Button>
              <span className="text-sm text-muted-foreground">
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={handleReset}>
                Start over
              </Button>
              <Button onClick={handleSubmit} disabled={!allAnswered || submitting} size="lg">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Submit answers
                  </>
                )}
              </Button>
            </div>
            {!allAnswered && (
              <p className="basis-full text-sm text-muted-foreground">
                Answer {questions.length - answeredCount} more before submitting.
              </p>
            )}
          </div>
        </div>
      )}

      {currentAttempt && submitted && (
        <div className="space-y-4">
          <PracticeResults attempt={currentAttempt} onTryAgain={handleReset} />
          {currentAttempt.questions.map((question, index) => (
            <PracticeQuestionCard
              key={index}
              question={question}
              index={index}
              onAnswer={() => {}}
              showResult
              auraReviewHref={buildAuraReviewHref(currentAttempt, index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
