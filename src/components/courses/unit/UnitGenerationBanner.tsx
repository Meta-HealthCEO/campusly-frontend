'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generationSummary } from '@/lib/course-unit';
import type { GenerationState } from '@/types/courses';

/** Progress while the unit's items are written; a summary once they're done. */
export function UnitGenerationBanner({ generation, noun = 'unit' }: { generation: GenerationState | undefined; noun?: string }) {
  const summary = generationSummary(generation);
  if (!summary) return null;
  const trouble = !summary.active && (generation?.failed ?? 0) > 0;
  return (
    <section
      role="status"
      aria-live="polite"
      className={`space-y-2 rounded-xl border px-4 py-3 ${trouble ? 'border-attention bg-attention-soft' : 'border-accent-foreground/20 bg-accent'}`}
    >
      <p className={`flex items-center gap-2 text-sm font-medium ${trouble ? 'text-attention' : 'text-accent-foreground'}`}>
        {summary.active ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        {summary.label}
      </p>
      {summary.active ? (
        <>
          <Progress value={summary.percent} aria-label="Items written" />
          <p className="text-xs text-muted-foreground">You can leave this page: the writing carries on, and each item shows here when it&apos;s ready.</p>
        </>
      ) : trouble ? (
        <p className="text-xs text-foreground">Try the items that couldn&apos;t be written again, or remove them, before releasing the {noun}.</p>
      ) : null}
    </section>
  );
}
