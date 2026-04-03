'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurriculumPacing } from '@/hooks/useCurriculumPacing';
import { useAuthStore } from '@/stores/useAuthStore';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import {
  PlanSelectorDropdown,
  PacingProgressBar,
  TopicProgressList,
  PacingUpdateDialog,
  PacingUpdateHistory,
} from '@/components/curriculum';
import { BookOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { CurriculumPlan, PacingUpdate, PacingUpdatePayload } from '@/types';

export default function TeacherCurriculumPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const {
    plans,
    plansLoading,
    fetchPlans,
    submitProgress,
    fetchProgressHistory,
  } = useCurriculumPacing();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<CurriculumPlan | null>(null);
  const [history, setHistory] = useState<PacingUpdate[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [schoolId, fetchPlans]);

  useEffect(() => {
    const plan = plans.find((p) => p.id === selectedPlanId) ?? null;
    setSelectedPlan(plan);
  }, [selectedPlanId, plans]);

  const loadHistory = useCallback(async (planId: string) => {
    setHistoryLoading(true);
    try {
      const result = await fetchProgressHistory(planId);
      setHistory(result);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchProgressHistory]);

  useEffect(() => {
    if (!selectedPlanId) {
      setHistory([]);
      return;
    }
    loadHistory(selectedPlanId);
  }, [selectedPlanId, loadHistory]);

  const handleSubmitUpdate = useCallback(async (data: PacingUpdatePayload) => {
    if (!selectedPlanId) return;
    setSaving(true);
    try {
      await submitProgress(selectedPlanId, data);
      toast.success('Weekly update submitted');
      setDialogOpen(false);
      await loadHistory(selectedPlanId);
    } catch (err: unknown) {
      toast.error('Failed to submit update');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [selectedPlanId, submitProgress, loadHistory]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum Pacing"
        description="Track your progress against the curriculum plan"
      />

      {plansLoading ? (
        <LoadingSpinner />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No plans assigned"
          description="You have no curriculum plans assigned. Contact your HOD."
        />
      ) : (
        <>
          <PlanSelectorDropdown
            plans={plans}
            selectedId={selectedPlanId}
            onChange={setSelectedPlanId}
          />

          {selectedPlan && (
            <div className="space-y-6">
              <PacingProgressBar
                actual={selectedPlan.pacingPercent ?? 0}
                expected={selectedPlan.expectedPercent ?? 0}
                status={selectedPlan.pacingStatus ?? 'on_track'}
              />

              <TopicProgressList topics={selectedPlan.topics} />

              <div className="flex justify-end">
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Weekly Update
                </Button>
              </div>

              {historyLoading ? (
                <LoadingSpinner />
              ) : (
                <PacingUpdateHistory updates={history} />
              )}
            </div>
          )}

          {!selectedPlanId && (
            <EmptyState
              icon={BookOpen}
              title="Select a plan"
              description="Choose a curriculum plan above to view progress and submit updates."
            />
          )}
        </>
      )}

      <PacingUpdateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        topics={selectedPlan?.topics ?? []}
        onSubmit={handleSubmitUpdate}
      />
    </div>
  );
}
