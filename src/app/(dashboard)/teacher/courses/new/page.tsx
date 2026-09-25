'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { UnitScopeForm } from '@/components/courses/unit/UnitScopeForm';
import { UnitSteps } from '@/components/courses/unit/UnitSteps';
import { useClassUnit, type CreateUnitInput } from '@/hooks/useClassUnit';
import { useAIUsage } from '@/hooks/useAIUsage';
import { aiActionsLeft } from '@/lib/ai-allowance';
import { AIUsageNotice, AIUsedUpState } from '@/components/billing/AIUsageNotice';
import { useIsStandalone } from '@/hooks/useIsStandalone';
import { lessonWords } from '@/lib/lesson-words';

export default function NewUnitPage() {
  const router = useRouter();
  const w = lessonWords(useIsStandalone());
  // Onboarding opens this page on the teacher's class and a CAPS topic.
  const searchParams = useSearchParams();
  const { createUnit, draftOutline } = useClassUnit();
  const { usage } = useAIUsage();
  const [busy, setBusy] = useState(false);
  // Once the unit exists, a failed draft is retried on it (no second unit).
  const [unitId, setUnitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = async (input: CreateUnitInput): Promise<void> => {
    setBusy(true);
    setError(null);
    let id = unitId;
    if (!id) {
      const unit = await createUnit(input);
      id = unit?.id ?? null;
      setUnitId(id);
    }
    if (!id) {
      setBusy(false);
      return;
    }
    const failure = await draftOutline(id);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    router.push(`/teacher/courses/${id}`);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/courses')}>
        <ChevronLeft className="mr-1 h-4 w-4" /> {w.Many}
      </Button>
      <PageHeader
        title={`New ${w.one} with AI`}
        description="Pick the class and the CAPS topics. The AI drafts an outline for you to check before anything is written."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-label={`${w.One} scope`}>
          {/* No AI actions left: say so instead of a form the server would refuse. */}
          {aiActionsLeft(usage) === 0 && unitId === null ? <AIUsedUpState usage={usage} /> : <UnitScopeForm noun={w.one} initialClassId={searchParams.get('classId')} preferTopicId={searchParams.get('topicId')} busy={busy} locked={unitId !== null} submitLabel={error ? 'Try again' : 'Draft the outline'} onSubmit={(input) => void draft(input)} />}
          {error ? (
            <div role="alert" className="mt-4 space-y-2 rounded-lg border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">
              <p>{error}</p>
              {unitId ? (
                <p className="text-foreground">
                  Your {w.one} is saved. <Link href={`/teacher/courses/${unitId}`} className="font-medium underline underline-offset-2">Open it</Link> to draft the outline later.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
        <aside className="space-y-4">
          <UnitSteps current="scope" noun={w.one} />
          <AIUsageNotice usage={usage} />
        </aside>
      </div>
    </div>
  );
}
