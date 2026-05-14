'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Send, Save, CheckCircle2 } from 'lucide-react';
import { useStudentTestTake } from '@/hooks/useStudentTests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { SubmissionAnswer } from '@/types/papers';

const AUTOSAVE_INTERVAL_MS = 25_000;

export function StudentTestTakeView({ paperId }: { paperId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');
  const fromLessonId = fromParam?.startsWith('lesson:') ? fromParam.slice(7) : null;
  const backHref = fromLessonId ? `/student/lessons/${fromLessonId}` : '/student/tests';
  const backLabel = fromLessonId ? 'Back to lesson' : 'Back to tests';
  const { paper, submission, loading, saving, submitting, save, submit } = useStudentTestTake(paperId);

  // Local answer map keyed by questionNumber. Hydrated from the submission
  // once it loads, mutated as the student types, flushed back via autosave.
  const [answers, setAnswers] = useState<Record<string, SubmissionAnswer>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!submission) return;
    const initial: Record<string, SubmissionAnswer> = {};
    for (const a of submission.answers) {
      initial[a.questionNumber] = a;
    }
    setAnswers(initial);
  }, [submission?.submissionId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Flatten the keyed map back to an array in stable question order.
  const orderedAnswers = useMemo<SubmissionAnswer[]>(() => {
    if (!paper) return [];
    const flat: SubmissionAnswer[] = [];
    for (const section of paper.sections) {
      for (const q of section.questions) {
        flat.push(
          answers[q.questionNumber] ?? { questionNumber: q.questionNumber, answer: '', selectedOption: null },
        );
      }
    }
    return flat;
  }, [paper, answers]);

  // Autosave timer — fires every 25s while the test is in_progress and
  // there's at least one answer typed. Saved silently in the background.
  useEffect(() => {
    if (!submission || submission.status !== 'in_progress') return;
    const id = window.setInterval(() => {
      if (orderedAnswers.some((a) => a.answer.trim() || a.selectedOption)) {
        void save(orderedAnswers);
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [submission, orderedAnswers, save]);

  const handleSubmit = useCallback(async () => {
    // Flush any pending answer changes first so we don't lose the final edits.
    await save(orderedAnswers);
    const result = await submit();
    if (result) {
      router.push(backHref);
    }
  }, [save, submit, orderedAnswers, router, backHref]);

  if (loading) return <LoadingSpinner />;
  if (!paper || !submission) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {backLabel}
        </Button>
        <p className="text-muted-foreground">Test not available.</p>
      </div>
    );
  }

  const isFinal = submission.status !== 'in_progress';
  const filledCount = orderedAnswers.filter(
    (a) => a.answer.trim().length > 0 || a.selectedOption,
  ).length;
  const totalQuestions = orderedAnswers.length;

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> {backLabel}
      </Button>

      <PageHeader
        title={paper.title}
        description={[
          paper.subjectName,
          paper.gradeName,
          `Term ${paper.term}`,
          `${paper.totalMarks} marks`,
          `${paper.duration} min`,
        ].filter(Boolean).join(' \u00B7 ')}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {filledCount}/{totalQuestions} answered
          </Badge>
          {saving && (
            <Badge variant="outline" className="text-xs">
              <Save className="mr-1 h-3 w-3" /> Saving…
            </Badge>
          )}
          {isFinal && (
            <Badge variant="default" className="text-xs">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted
            </Badge>
          )}
        </div>
      </PageHeader>

      {paper.sections.map((section, idx) => (
        <section key={`${section.title}-${idx}`} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.instructions && (
              <p className="text-sm text-muted-foreground">{section.instructions}</p>
            )}
          </div>

          {section.questions.map((q) => {
            const current = answers[q.questionNumber] ?? {
              questionNumber: q.questionNumber, answer: '', selectedOption: null,
            };
            return (
              <Card key={q.questionNumber}>
                <CardHeader className="pb-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">
                      Q{q.questionNumber}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {q.marks} mark{q.marks === 1 ? '' : 's'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{q.questionText}</p>
                  {q.diagramSvgUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={q.diagramSvgUrl}
                      alt="Question diagram"
                      className="max-w-full border rounded"
                    />
                  )}

                  {q.type === 'mcq' && q.options.length > 0 ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const isPicked = current.selectedOption === opt.label;
                        return (
                          <label
                            key={opt.label}
                            className={[
                              'flex items-start gap-3 rounded-md border p-2.5 cursor-pointer text-sm transition-colors',
                              isPicked ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                              isFinal ? 'pointer-events-none opacity-70' : '',
                            ].join(' ')}
                          >
                            <input
                              type="radio"
                              name={`q-${q.questionNumber}`}
                              value={opt.label}
                              checked={isPicked}
                              disabled={isFinal}
                              onChange={() => {
                                setAnswers((prev) => ({
                                  ...prev,
                                  [q.questionNumber]: {
                                    questionNumber: q.questionNumber,
                                    answer: '',
                                    selectedOption: opt.label,
                                  },
                                }));
                              }}
                              className="mt-1"
                            />
                            <span><strong>{opt.label}.</strong> {opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor={`a-${q.questionNumber}`} className="text-xs text-muted-foreground">
                        Your answer
                      </Label>
                      <Textarea
                        id={`a-${q.questionNumber}`}
                        rows={Math.min(8, Math.max(2, q.marks))}
                        value={current.answer}
                        readOnly={isFinal}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAnswers((prev) => ({
                            ...prev,
                            [q.questionNumber]: {
                              questionNumber: q.questionNumber,
                              answer: value,
                              selectedOption: null,
                            },
                          }));
                        }}
                        placeholder="Type your answer here…"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      ))}

      {!isFinal && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={() => setConfirmOpen(true)} disabled={submitting} size="lg">
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Submitting…' : 'Submit test'}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit this test?"
        description={`You've answered ${filledCount} of ${totalQuestions} questions. Once submitted you can't change your answers.`}
        confirmLabel="Submit"
        onConfirm={async () => {
          setConfirmOpen(false);
          await handleSubmit();
        }}
      />
    </div>
  );
}
