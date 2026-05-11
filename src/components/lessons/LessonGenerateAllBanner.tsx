'use client';

import { useState } from 'react';
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { LessonMaterial } from '@/types/lesson';

interface GenerateAllResult {
  total: number;
  succeeded: number;
  failed: Array<{ materialId: string; title: string; error: string }>;
}

interface Props {
  materials: LessonMaterial[];
  generateAllPlaceholders: () => Promise<GenerateAllResult>;
}

/**
 * A material is a scaffold-emitted placeholder when it has no `generatedAt`
 * AND no underlying entity ref. Mirrors the backend predicate so the banner
 * count matches what the server will actually process.
 */
function isPlaceholder(material: LessonMaterial): boolean {
  if (material.generatedAt) return false;
  const m = material as LessonMaterial & {
    contentResourceId?: string;
    homeworkId?: string;
    paperId?: string;
    quizId?: string;
    questionIds?: string[];
    comprehensionQuestionIds?: string[];
  };
  if (m.contentResourceId) return false;
  if (m.homeworkId) return false;
  if (m.paperId) return false;
  if (m.quizId) return false;
  if (Array.isArray(m.questionIds) && m.questionIds.length > 0) return false;
  if (
    Array.isArray(m.comprehensionQuestionIds)
    && m.comprehensionQuestionIds.length > 0
  ) {
    return false;
  }
  return true;
}

export function LessonGenerateAllBanner({
  materials,
  generateAllPlaceholders,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<GenerateAllResult | null>(null);
  const [showFailures, setShowFailures] = useState(false);

  const placeholderCount = materials.filter(isPlaceholder).length;
  if (placeholderCount === 0) return null;

  const run = async () => {
    setBusy(true);
    setLastResult(null);
    setShowFailures(false);
    try {
      const result = await generateAllPlaceholders();
      setLastResult(result);
      if (result.failed.length === 0) {
        toast.success(`Generated ${result.succeeded} materials`);
      } else if (result.succeeded === 0) {
        toast.warning(
          `0 of ${result.total} generated. ${result.failed.length} need manual setup.`,
        );
        setShowFailures(true);
      } else {
        toast.warning(
          `Generated ${result.succeeded} of ${result.total}. ${result.failed.length} need manual setup.`,
        );
        setShowFailures(true);
      }
    } catch {
      // hook already toasted
    } finally {
      setBusy(false);
    }
  };

  const noun = placeholderCount === 1 ? 'placeholder material' : 'placeholder materials';

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight">
              {placeholderCount} {noun} waiting
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate them all at once. Reading, quiz, homework and paper
              placeholders need manual setup and will be skipped.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="default"
          onClick={() => void run()}
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating... (1-2 min)
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate all
            </>
          )}
        </Button>
      </div>

      {lastResult && lastResult.failed.length > 0 && (
        <div className="mt-3 border-t border-primary/20 pt-3">
          <button
            type="button"
            onClick={() => setShowFailures((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showFailures ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {lastResult.failed.length} skipped — needs manual setup
          </button>
          {showFailures && (
            <ul className="mt-2 space-y-1 text-xs">
              {lastResult.failed.map((f) => (
                <li key={f.materialId} className="flex flex-col gap-0.5">
                  <span className="font-medium truncate">{f.title}</span>
                  <span className="text-muted-foreground">{f.error}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
