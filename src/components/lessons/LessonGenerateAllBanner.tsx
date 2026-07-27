'use client';

import { useMemo, useState } from 'react';
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { LessonMaterial, LessonMaterialKind } from '@/types/lesson';

interface GenerateAllResult {
  total: number;
  succeeded: number;
  failed: Array<{ materialId: string; title: string; error: string }>;
}

interface Props {
  materials: LessonMaterial[];
  generateAllPlaceholders: () => Promise<GenerateAllResult>;
  /** Lesson must be assigned to at least one class — homework auto-generation
   *  needs an audience, so without a class it falls into the manual bucket. */
  lessonHasAssignedClass: boolean;
}

const ALWAYS_MANUAL_KINDS: ReadonlySet<LessonMaterialKind> = new Set([
  'reading',
  'quiz',
]);

/** Reasons a specific placeholder can't be auto-generated. Mirrors the
 *  backend's buildPayloadForPlaceholder skips so the count matches reality. */
function manualReason(
  material: LessonMaterial,
  lessonHasAssignedClass: boolean,
): string | null {
  if (ALWAYS_MANUAL_KINDS.has(material.kind)) {
    if (material.kind === 'reading') return 'needs a textbook reference';
    if (material.kind === 'quiz') return 'needs an existing quiz';
  }
  if (material.kind === 'homework' && !lessonHasAssignedClass) {
    return 'needs an assigned class';
  }
  return null;
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
  lessonHasAssignedClass,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<GenerateAllResult | null>(null);
  const [showFailures, setShowFailures] = useState(false);

  const { autoItems, manualItems } = useMemo(() => {
    const placeholders = materials.filter(isPlaceholder);
    const auto: LessonMaterial[] = [];
    const manual: Array<{ material: LessonMaterial; reason: string }> = [];
    for (const m of placeholders) {
      const reason = manualReason(m, lessonHasAssignedClass);
      if (reason) manual.push({ material: m, reason });
      else auto.push(m);
    }
    return { autoItems: auto, manualItems: manual };
  }, [materials, lessonHasAssignedClass]);

  if (autoItems.length === 0 && manualItems.length === 0) return null;

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

  const autoNoun = autoItems.length === 1 ? 'material' : 'materials';

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <p className="text-base font-semibold tracking-tight">
              {autoItems.length > 0
                ? `${autoItems.length} ${autoNoun} ready to auto-generate`
                : 'Nothing to auto-generate'}
              {manualItems.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  {' '}· {manualItems.length} need{manualItems.length === 1 ? 's' : ''} manual setup
                </span>
              )}
            </p>
            {autoItems.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {autoItems.map((m) => (
                  <li key={m._id} className="truncate">
                    <span className="text-emerald-700">●</span> {m.title}
                  </li>
                ))}
              </ul>
            )}
            {manualItems.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5 pt-1">
                {manualItems.map(({ material, reason }) => (
                  <li key={material._id} className="truncate">
                    <span className="text-amber-700">●</span> {material.title}
                    {' '}<span className="italic">— {reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Button
          type="button"
          size="default"
          onClick={() => void run()}
          disabled={busy || autoItems.length === 0}
          className="w-full sm:w-auto shrink-0"
          title={
            autoItems.length === 0
              ? 'All remaining placeholders need manual setup'
              : undefined
          }
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {autoItems.length === 0
            ? 'Nothing to generate'
            : `Generate ${autoItems.length}`}
        </Button>
      </div>

      <Dialog open={busy} onOpenChange={() => { /* uncloseable while busy */ }}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md flex flex-col items-center text-center gap-4 py-8"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </span>
          <div>
            <p className="text-base font-semibold">Generating your lesson</p>
            <p className="text-sm text-muted-foreground mt-1">
              Filling in {autoItems.length} {autoNoun}. This usually takes 1-2 minutes.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Don&apos;t navigate away — we&apos;ll close this when it&apos;s done.
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
