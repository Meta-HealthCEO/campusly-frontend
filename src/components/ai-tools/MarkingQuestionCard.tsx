'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MarkingQuestion } from '@/hooks/useTeacherMarking';

interface MarkingQuestionCardProps {
  question: MarkingQuestion;
  index: number;
  editable: boolean;
  rationaleLabel: 'AI Rationale' | 'Rationale';
  onChange?: (marksAwarded: number) => void;
}

function scoreBadgeVariant(awarded: number, max: number) {
  if (awarded === max) return 'default' as const;
  if (awarded > 0) return 'secondary' as const;
  return 'destructive' as const;
}

export function MarkingQuestionCard({
  question, index, editable, rationaleLabel, onChange,
}: MarkingQuestionCardProps) {
  const [rationaleOpen, setRationaleOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Question {question.questionNumber || index + 1}</CardTitle>
          <Badge variant={scoreBadgeVariant(question.marksAwarded, question.maxMarks)}>
            {question.marksAwarded} / {question.maxMarks}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs mb-1">Student answer</p>
          <p className="whitespace-pre-wrap">{question.studentAnswer || <span className="italic text-muted-foreground">No answer</span>}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">Correct answer</p>
          <p className="whitespace-pre-wrap">{question.correctAnswer}</p>
        </div>
        {question.feedback && (
          <div>
            <p className="text-muted-foreground text-xs mb-1">Feedback</p>
            <p className="whitespace-pre-wrap">{question.feedback}</p>
          </div>
        )}
        {question.rationale && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRationaleOpen((v) => !v)}
              className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent"
            >
              {rationaleOpen ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {rationaleLabel}
            </Button>
            {rationaleOpen && (
              <p className="whitespace-pre-wrap mt-2 text-muted-foreground">{question.rationale}</p>
            )}
          </div>
        )}
        {editable && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Adjust marks:</span>
            <Input
              type="number"
              min={0}
              max={question.maxMarks}
              step={0.5}
              value={question.marksAwarded}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className="w-20 h-8"
            />
            <span className="text-xs text-muted-foreground">/ {question.maxMarks}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
