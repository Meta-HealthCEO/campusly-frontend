'use client';

import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  aiCount: number;
  setAiCount: (n: number) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  totalMarks: number;
  setTotalMarks: (n: number) => void;
}

export function HomeworkAiModePanel(props: Props) {
  const { aiCount, setAiCount, dueDate, setDueDate, totalMarks, setTotalMarks } = props;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
        <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>
          Generate a homework on this topic — questions are created from your
          teacher notes (or the title) and pinned to the lesson&apos;s curriculum
          topic. One click, no pre-staging.
        </span>
      </div>

      <div>
        <Label htmlFor="hw-ai-count">
          Question count <span className="text-destructive">*</span>
        </Label>
        <Input
          id="hw-ai-count" type="number" min={1} max={20} className="w-full sm:w-40"
          value={aiCount}
          onChange={(e) => setAiCount(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground mt-1">
          A mix of MCQ and short-answer (1-20).
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <div>
          <Label htmlFor="hw-ai-due">
            Due date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-ai-due" type="date" className="w-full"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hw-ai-marks">
            Total marks <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hw-ai-marks" type="number" min={0} max={1000} className="w-full"
            value={totalMarks}
            onChange={(e) => setTotalMarks(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
