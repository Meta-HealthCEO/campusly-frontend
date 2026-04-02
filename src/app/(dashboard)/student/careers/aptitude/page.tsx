'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useAptitude } from '@/hooks/useAptitude';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AptitudeQuestion } from '@/components/careers/AptitudeQuestion';
import { AptitudeResults } from '@/components/careers/AptitudeResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

type PageState = 'idle' | 'checkResults' | 'hasResults' | 'intro' | 'inProgress' | 'submitting';

export default function AptitudePage() {
  const router = useRouter();
  const { student, loading: studentLoading } = useCurrentStudent();
  const {
    questionnaire,
    result,
    loading: aptLoading,
    fetchQuestions,
    submitAnswers,
    fetchResults,
  } = useAptitude();

  const [pageState, setPageState] = useState<PageState>('idle');
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Fetch existing results once student resolves
  useEffect(() => {
    if (!student?.id) return;
    fetchResults(student.id).then(() => setPageState('checkResults'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  // After fetching results, decide next state
  useEffect(() => {
    if (pageState !== 'checkResults') return;
    setPageState(result ? 'hasResults' : 'intro');
  }, [pageState, result]);

  const sections = questionnaire?.sections ?? [];
  const activeSection = sections[currentSection];

  const totalQuestions = questionnaire?.totalQuestions ?? 0;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const isLastSection = currentSection === sections.length - 1;

  const allCurrentSectionAnswered = useMemo(() => {
    if (!activeSection) return false;
    return activeSection.questions.every((q) => answers[q.id] !== undefined);
  }, [activeSection, answers]);

  const handleAnswer = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleStart = async () => {
    await fetchQuestions();
    setCurrentSection(0);
    setAnswers({});
    setPageState('inProgress');
  };

  const handleRetake = () => {
    setPageState('intro');
  };

  const handleSubmit = async () => {
    setPageState('submitting');
    try {
      const payload = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));
      await submitAnswers(payload);
      toast.success('Assessment submitted successfully');
      setPageState('hasResults');
    } catch (err: unknown) {
      console.error('Failed to submit assessment:', err);
      toast.error('Failed to submit assessment. Please try again.');
      setPageState('inProgress');
    }
  };

  const handleExploreCareers = (cluster: string) => {
    router.push(`/student/careers/explore?cluster=${encodeURIComponent(cluster)}`);
  };

  // --- Loading states ---
  if (studentLoading) return <LoadingSpinner />;

  if (!student) {
    return (
      <EmptyState
        icon={Target}
        title="Student not found"
        description="Unable to resolve your student profile."
      />
    );
  }

  if (pageState === 'idle' || (pageState === 'checkResults' && aptLoading)) {
    return <LoadingSpinner />;
  }

  // --- Results view ---
  if (pageState === 'hasResults' && result) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aptitude Results"
          description="Your career aptitude assessment results"
        >
          <Button variant="outline" onClick={handleRetake}>
            Retake Assessment
          </Button>
        </PageHeader>
        <AptitudeResults result={result} onExploreCareers={handleExploreCareers} />
      </div>
    );
  }

  // --- Intro view ---
  if (pageState === 'intro') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Career Aptitude Assessment"
          description="Discover career paths that match your strengths and interests"
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              Career Aptitude Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This assessment will help identify your strengths, interests, and personality
              type to suggest career clusters and paths that may be a good fit for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <div className="rounded-lg border p-3 flex-1">
                <p className="font-medium">Estimated Time</p>
                <p className="text-muted-foreground">
                  {questionnaire?.estimatedMinutes ?? 15} minutes
                </p>
              </div>
              <div className="rounded-lg border p-3 flex-1">
                <p className="font-medium">Total Questions</p>
                <p className="text-muted-foreground">
                  {questionnaire?.totalQuestions ?? '—'}
                </p>
              </div>
            </div>
            <Button onClick={handleStart} disabled={aptLoading} className="w-full sm:w-auto">
              {aptLoading ? 'Loading...' : 'Start Assessment'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Submitting view ---
  if (pageState === 'submitting') {
    return <LoadingSpinner />;
  }

  // --- In progress view ---
  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Aptitude Assessment"
        description={activeSection ? activeSection.name : 'Answer each question honestly'}
      />

      {/* Progress */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {answeredCount} of {totalQuestions} questions answered
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} />
          <p className="text-xs text-muted-foreground">
            Section {currentSection + 1} of {sections.length}
          </p>
        </CardContent>
      </Card>

      {/* Section questions */}
      {activeSection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{activeSection.name}</CardTitle>
            {activeSection.description && (
              <p className="text-sm text-muted-foreground">{activeSection.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {activeSection.questions.map((q) => (
              <AptitudeQuestion
                key={q.id}
                questionId={q.id}
                text={q.text}
                options={q.options}
                value={answers[q.id] ?? null}
                onChange={handleAnswer}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentSection((s) => Math.max(0, s - 1))}
          disabled={currentSection === 0}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="size-4 mr-1" />
          Previous Section
        </Button>

        {isLastSection ? (
          <Button
            onClick={handleSubmit}
            disabled={answeredCount < totalQuestions}
            className="w-full sm:w-auto"
          >
            Submit Assessment
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentSection((s) => Math.min(sections.length - 1, s + 1))}
            disabled={!allCurrentSectionAnswered}
            className="w-full sm:w-auto"
          >
            Next Section
            <ChevronRight className="size-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
