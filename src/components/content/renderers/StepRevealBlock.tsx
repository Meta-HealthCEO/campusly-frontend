'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import type { ContentBlockItem } from '@/types';

interface StepData {
  steps: { title: string; content: string }[];
}

interface StepRevealBlockProps {
  block: ContentBlockItem;
  /** Called once, the first time every step has been revealed — a worked example is "read" from here, not from opening it. */
  onAllRevealed?: () => void;
}

export function StepRevealBlock({ block, onAllRevealed }: StepRevealBlockProps) {
  const data = useMemo<StepData>(() => {
    try { return JSON.parse(block.content) as StepData; }
    catch { return { steps: [] }; }
  }, [block.content]);

  const [revealedCount, setRevealedCount] = useState(1);

  const revealNext = () => setRevealedCount((p) => Math.min(p + 1, data.steps.length));
  const allRevealed = revealedCount >= data.steps.length;

  const notifiedRef = useRef(false);
  useEffect(() => {
    if (allRevealed && data.steps.length > 0 && !notifiedRef.current) {
      notifiedRef.current = true;
      onAllRevealed?.();
    }
  }, [allRevealed, data.steps.length, onAllRevealed]);

  return (
    <div className="space-y-3">
      {data.steps.slice(0, revealedCount).map((step, i) => (
        <div
          key={i}
          className="rounded-lg border p-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-primary text-xs font-bold shrink-0">
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
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          All steps revealed
        </div>
      )}
    </div>
  );
}
