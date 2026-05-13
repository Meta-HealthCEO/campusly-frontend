'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowLeft, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import type { Paper, PaperQuestion } from '@/types/papers';

export interface DigitalAnswer {
  questionNumber: string;
  answer: string;
}

interface Props {
  paperId: string;
  onSubmit: (answers: DigitalAnswer[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

interface RenderedQuestion {
  questionNumber: string;
  questionText: string;
  marks: number;
}

/**
 * Flattens the paper's sections into a flat list of questions with the same
 * "{section+1}.{position+1}" numbering convention used by the backend memo
 * builder (see service-marking.ts loadPaperInfo).
 */
function flattenQuestions(paper: Paper): RenderedQuestion[] {
  const result: RenderedQuestion[] = [];
  paper.sections.forEach((section, sectionIdx) => {
    section.questions.forEach((q: PaperQuestion) => {
      const questionNumber = `${sectionIdx + 1}.${q.position + 1}`;
      let questionText = q.questionText ?? '';
      if (!questionText && typeof q.questionId === 'object' && q.questionId !== null) {
        questionText = q.questionId.stem ?? '';
      }
      result.push({
        questionNumber,
        questionText: questionText || '(question text unavailable)',
        marks: q.marks,
      });
    });
  });
  return result;
}

export function MarkingTextEntry({ paperId, onSubmit, onBack, isLoading }: Props) {
  const { getPaperById } = useTeacherPapers(false);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [paperLoading, setPaperLoading] = useState(true);
  const [paperError, setPaperError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setPaperLoading(true);
    setPaperError(null);
    void getPaperById(paperId).then((p) => {
      if (cancelled) return;
      if (!p) {
        setPaperError('Could not load paper.');
      } else {
        setPaper(p);
      }
      setPaperLoading(false);
    });
    return () => { cancelled = true; };
  }, [paperId, getPaperById]);

  const questions = useMemo(() => (paper ? flattenQuestions(paper) : []), [paper]);

  const filledCount = useMemo(
    () => questions.filter((q) => (answers[q.questionNumber] ?? '').trim().length > 0).length,
    [questions, answers],
  );

  const handleSubmit = () => {
    const payload: DigitalAnswer[] = questions.map((q) => ({
      questionNumber: q.questionNumber,
      answer: answers[q.questionNumber] ?? '',
    }));
    onSubmit(payload);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Marking paper... this may take 15-60 seconds</p>
          <p className="text-xs text-muted-foreground">
            AI is grading the typed answers against the memorandum
          </p>
        </CardContent>
      </Card>
    );
  }

  if (paperLoading) return <LoadingSpinner />;

  if (paperError || !paper) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load paper"
        description={paperError ?? 'Paper not found.'}
        action={
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />
    );
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No questions in this paper"
        description="Add questions to the paper before marking digital submissions."
        action={
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Type the student&apos;s answers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Paste or type the student&apos;s typed answer for each question. Empty answers will
          score 0. Filled: {filledCount}/{questions.length}.
        </p>

        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.questionNumber} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={`q-${q.questionNumber}`} className="text-sm font-medium">
                  Q{q.questionNumber}{' '}
                  <span className="text-xs text-muted-foreground">({q.marks} marks)</span>
                </Label>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{q.questionText}</p>
              <Textarea
                id={`q-${q.questionNumber}`}
                rows={3}
                value={answers[q.questionNumber] ?? ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.questionNumber]: e.target.value }))
                }
                placeholder="Paste or type the student's answer..."
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={filledCount === 0}>
            <Sparkles className="mr-2 h-4 w-4" />
            Mark this paper
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
