'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw, Send, ListOrdered, Save } from 'lucide-react';
import type { PaperMarking, MarkingQuestion } from '@/hooks/useTeacherMarking';

interface MarkingResultsProps {
  marking: PaperMarking;
  onUpdateMarks: (questions: MarkingQuestion[]) => Promise<void>;
  onPublish: () => Promise<void>;
  onMarkNext: () => void;
  onViewAll: () => void;
  isLoading: boolean;
}

function scoreBadgeVariant(awarded: number, max: number) {
  if (awarded === max) return 'default' as const;
  if (awarded > 0) return 'secondary' as const;
  return 'destructive' as const;
}

export function MarkingResults({
  marking,
  onUpdateMarks,
  onPublish,
  onMarkNext,
  onViewAll,
  isLoading,
}: MarkingResultsProps) {
  const [questions, setQuestions] = useState<MarkingQuestion[]>(marking.questions);
  const [dirty, setDirty] = useState(false);

  const adjustedTotal = useMemo(
    () => questions.reduce((sum, q) => sum + q.marksAwarded, 0),
    [questions],
  );

  const adjustedPct = useMemo(
    () => (marking.maxMarks > 0 ? Math.round((adjustedTotal / marking.maxMarks) * 1000) / 10 : 0),
    [adjustedTotal, marking.maxMarks],
  );

  const handleAdjust = useCallback((index: number, marks: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const q = updated[index];
      updated[index] = { ...q, marksAwarded: Math.min(Math.max(0, marks), q.maxMarks) };
      return updated;
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    await onUpdateMarks(questions);
    setDirty(false);
  }, [onUpdateMarks, questions]);

  const pctVariant = adjustedPct >= 50 ? 'default' : 'destructive';
  const statusVariant = marking.status === 'published' ? 'default' : 'secondary';

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{marking.studentName}</CardTitle>
              <Badge variant={statusVariant} className="capitalize shrink-0">
                {marking.status}
              </Badge>
            </div>
            <Badge variant={pctVariant} className="text-sm shrink-0">
              {adjustedTotal} / {marking.maxMarks} ({adjustedPct}%)
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Q{q.questionNumber}</span>
                    <Badge variant={scoreBadgeVariant(q.marksAwarded, q.maxMarks)}>
                      {q.marksAwarded}/{q.maxMarks}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Student: </span>
                      <span className="line-clamp-2">{q.studentAnswer}</span>
                    </p>
                    <p>
                      <span className="font-medium">Correct: </span>
                      <span className="text-muted-foreground line-clamp-2">{q.correctAnswer}</span>
                    </p>
                    <p className="text-muted-foreground text-xs">{q.feedback}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:flex-col sm:items-end shrink-0">
                  <span className="text-xs text-muted-foreground">Marks:</span>
                  <Input
                    type="number"
                    min={0}
                    max={q.maxMarks}
                    value={q.marksAwarded}
                    onChange={(e) => handleAdjust(idx, Number(e.target.value))}
                    className="w-16 h-8 text-center text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {dirty && (
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save adjustments
          </Button>
        )}
        <Button
          variant={marking.status === 'published' ? 'outline' : 'default'}
          onClick={onPublish}
          disabled={isLoading || marking.status === 'published'}
        >
          <Send className="mr-2 h-4 w-4" />
          Publish to gradebook
        </Button>
        <Button variant="outline" onClick={onMarkNext}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Mark next student
        </Button>
        <Button variant="outline" onClick={onViewAll}>
          <ListOrdered className="mr-2 h-4 w-4" />
          View all results
        </Button>
      </div>
    </div>
  );
}
