'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import type { ContentBlockItem } from '@/types';

interface StepData {
  steps: { title: string; content: string }[];
}

interface StepRevealBlockProps {
  block: ContentBlockItem;
}

export function StepRevealBlock({ block }: StepRevealBlockProps) {
  const data = useMemo<StepData>(() => {
    try { return JSON.parse(block.content) as StepData; }
    catch { return { steps: [] }; }
  }, [block.content]);

  const [revealedCount, setRevealedCount] = useState(1);

  const revealNext = () => setRevealedCount((p) => Math.min(p + 1, data.steps.length));
  const allRevealed = revealedCount >= data.steps.length;

  return (
    <div className="space-y-3">
      {data.steps.slice(0, revealedCount).map((step, i) => (
        <div
          key={i}
          className="rounded-lg border p-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {i + 1}
            </span>
            <h4 className="text-sm font-semibold">{step.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground pl-8">{step.content}</p>
        </div>
      ))}

      {!allRevealed && (
        <Button variant="outline" size="sm" onClick={revealNext} className="gap-1.5">
          <ChevronRight className="h-4 w-4" />
          Next Step ({revealedCount}/{data.steps.length})
        </Button>
      )}

      {allRevealed && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          All steps revealed
        </div>
      )}
    </div>
  );
}
