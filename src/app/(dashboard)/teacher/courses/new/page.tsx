'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { UnitScopeForm } from '@/components/courses/unit/UnitScopeForm';
import { UnitSteps } from '@/components/courses/unit/UnitSteps';
import { useClassUnit, type CreateUnitInput } from '@/hooks/useClassUnit';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useAuthStore } from '@/stores/useAuthStore';
import { shouldShowFreeUnitsBanner } from '@/lib/course-unit';

export default function NewUnitPage() {
  const router = useRouter();
  const { createUnit, draftOutline } = useClassUnit();
  const freeUnits = useAuthStore((s) => s.freeAllowance?.courseUnits ?? null);
  const refreshAccount = useAuthStore((s) => s.refreshAccount);
  // The Pro AI-generation switch is the same paperGeneration entitlement the
  // server checks for building a unit (assertCourseGenerationAccess).
  const entitled = useEntitlement('paperGeneration');
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
    // A free-plan teacher just used one of their free AI units.
    void refreshAccount();
    router.push(`/teacher/courses/${id}`);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/courses')}>
        <ChevronLeft className="mr-1 h-4 w-4" /> Courses
      </Button>
      <PageHeader
        title="New unit with AI"
        description="Pick the class and the CAPS topics. The AI drafts an outline for you to check before anything is written."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-label="Unit scope">
          <UnitScopeForm busy={busy} locked={unitId !== null} submitLabel={error ? 'Try again' : 'Draft the outline'} onSubmit={(input) => void draft(input)} />
          {error ? (
            <div role="alert" className="mt-4 space-y-2 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
              <p>{error}</p>
              {unitId ? (
                <p className="text-foreground">
                  Your unit is saved. <Link href={`/teacher/courses/${unitId}`} className="font-medium underline underline-offset-2">Open it</Link> to draft the outline later.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
        <aside className="space-y-4">
          <UnitSteps current="scope" />
          {shouldShowFreeUnitsBanner(entitled, freeUnits) && freeUnits ? (
            <p className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground">{freeUnits.remaining}</span> of {freeUnits.limit} free AI units left on your plan.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
