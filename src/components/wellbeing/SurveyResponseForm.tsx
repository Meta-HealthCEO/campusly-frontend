'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WellbeingSurvey, SurveyAnswer } from '@/types';

interface SurveyResponseFormProps {
  survey: WellbeingSurvey;
  onSubmit: (answers: SurveyAnswer[]) => Promise<void>;
}

export function SurveyResponseForm({ survey, onSubmit }: SurveyResponseFormProps) {
  const [answers, setAnswers] = useState<Record<number, string | number | boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const setAnswer = (idx: number, value: string | number | boolean) => {
    setAnswers((prev) => ({ ...prev, [idx]: value }));
  };

  const handleSubmit = async () => {
    const formatted: SurveyAnswer[] = Object.entries(answers).map(([idx, value]) => ({
      questionIndex: Number(idx), value,
    }));
    try {
      setSubmitting(true);
      await onSubmit(formatted);
    } catch (err: unknown) {
      console.error('Failed to submit response', err);
    } finally {
      setSubmitting(false);
    }
  };

  const allRequiredAnswered = survey.questions.every((q, idx) =>
    !q.required || answers[idx] !== undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{survey.title}</CardTitle>
        {survey.description && <CardDescription>{survey.description}</CardDescription>}
        {survey.isAnonymous && (
          <p className="text-xs text-muted-foreground">Your responses are anonymous.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {survey.questions.map((q, idx) => (
          <div key={idx} className="space-y-2">
            <Label className="text-sm font-medium">
              {q.text} {q.required && <span className="text-destructive">*</span>}
            </Label>

            {q.type === 'scale' && (
              <div className="flex gap-2 flex-wrap">
                {Array.from(
                  { length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 },
                  (_, i) => (q.scaleMin ?? 1) + i,
                ).map((val) => (
                  <Button
                    key={val}
                    variant={answers[idx] === val ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAnswer(idx, val)}
                    className="min-w-[44px]"
                  >
                    {val}
                  </Button>
                ))}
              </div>
            )}

            {q.type === 'multiple_choice' && (
              <div className="flex gap-2 flex-wrap">
                {(q.options ?? []).map((opt) => (
                  <Button
                    key={opt}
                    variant={answers[idx] === opt ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAnswer(idx, opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <Textarea
                value={(answers[idx] as string) ?? ''}
                onChange={(e) => setAnswer(idx, e.target.value)}
                placeholder="Type your response..."
                rows={3}
              />
            )}

            {q.type === 'yes_no' && (
              <div className="flex gap-2">
                <Button
                  variant={answers[idx] === true ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnswer(idx, true)}
                  className="min-w-[60px]"
                >
                  Yes
                </Button>
                <Button
                  variant={answers[idx] === false ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnswer(idx, false)}
                  className="min-w-[60px]"
                >
                  No
                </Button>
              </div>
            )}
          </div>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={submitting || !allRequiredAnswered}
          className="w-full sm:w-auto"
        >
          {submitting ? 'Submitting...' : 'Submit Response'}
        </Button>
      </CardContent>
    </Card>
  );
}
