'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle, RotateCcw } from 'lucide-react';
import type { MarkPaperQuestionResult } from '@/hooks/useAITools';

interface AdjustedQuestion extends MarkPaperQuestionResult {
  adjustedMarks: number;
}

interface MarkingResultsPanelProps {
  studentName: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  questions: AdjustedQuestion[];
  onAdjustMark: (index: number, marks: number) => void;
  onAccept: () => void;
  onMarkAnother: () => void;
}

function getScoreBadge(awarded: number, max: number) {
  if (awarded === max) return 'default';
  if (awarded > 0) return 'secondary';
  return 'destructive';
}

function getScoreColor(awarded: number, max: number): string {
  if (awarded === max) return 'text-emerald-600 dark:text-emerald-400';
  if (awarded > 0) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

export function MarkingResultsPanel({
  studentName,
  totalMarks,
  maxMarks,
  percentage,
  questions,
  onAdjustMark,
  onAccept,
  onMarkAnother,
}: MarkingResultsPanelProps) {
  const adjustedTotal = useMemo(
    () => questions.reduce((sum, q) => sum + q.adjustedMarks, 0),
    [questions],
  );

  const adjustedPercentage = useMemo(
    () => (maxMarks > 0 ? Math.round((adjustedTotal / maxMarks) * 1000) / 10 : 0),
    [adjustedTotal, maxMarks],
  );

  const percentageBadgeVariant = adjustedPercentage >= 50 ? 'default' : 'destructive';

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{studentName}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={percentageBadgeVariant} className="text-sm">
                {adjustedTotal} / {maxMarks} ({adjustedPercentage}%)
              </Badge>
              {adjustedTotal !== totalMarks && (
                <span className="text-xs text-muted-foreground">
                  AI: {totalMarks} ({percentage}%)
                </span>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Q{q.questionNumber}</span>
                    <Badge variant={getScoreBadge(q.adjustedMarks, q.maxMarks)}>
                      {q.adjustedMarks}/{q.maxMarks}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Student: </span>
                      <span className={getScoreColor(q.adjustedMarks, q.maxMarks)}>
                        {q.studentAnswer}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Correct: </span>
                      <span className="text-muted-foreground line-clamp-2">
                        {q.correctAnswer}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-xs">{q.feedback}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:flex-col sm:items-end">
                  <span className="text-xs text-muted-foreground">Marks:</span>
                  <Input
                    type="number"
                    min={0}
                    max={q.maxMarks}
                    value={q.adjustedMarks}
                    onChange={(e) => {
                      const val = Math.min(Math.max(0, Number(e.target.value)), q.maxMarks);
                      onAdjustMark(idx, val);
                    }}
                    className="w-16 h-8 text-center text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onAccept} className="flex-1 sm:flex-none">
          <CheckCircle className="mr-2 h-4 w-4" />
          Accept Marks ({adjustedTotal}/{maxMarks})
        </Button>
        <Button variant="outline" onClick={onMarkAnother}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Mark Another Paper
        </Button>
      </div>
    </div>
  );
}
