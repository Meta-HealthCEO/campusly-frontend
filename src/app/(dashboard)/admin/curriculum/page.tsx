'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurriculumPacing } from '@/hooks/useCurriculumPacing';
import { useCurriculumBenchmarks } from '@/hooks/useCurriculumBenchmarks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  PacingOverviewCards,
  PacingTrafficLight,
  BenchmarkComparisonTable,
  InterventionList,
  InterventionDialog,
} from '@/components/curriculum';
import { LayoutDashboard, Target, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import type { BenchmarkComparison, CurriculumIntervention, InterventionStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function AdminCurriculumPage() {
  const {
    overview,
    overviewLoading,
    fetchOverview,
  } = useCurriculumPacing();

  const {
    interventions,
    interventionsLoading,
    fetchInterventions,
    fetchComparison,
    updateIntervention,
  } = useCurriculumBenchmarks();

  const [activeTab, setActiveTab] = useState<string | number>('overview');
  const [comparisonYear, setComparisonYear] = useState<number>(CURRENT_YEAR);
  const [comparisons, setComparisons] = useState<BenchmarkComparison[]>([]);
  const [comparisonsLoading, setComparisonsLoading] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<CurriculumIntervention | null>(null);
  const [interventionDialogOpen, setInterventionDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab !== 'benchmarks') return;
    loadComparisons();
  }, [activeTab, comparisonYear]);

  useEffect(() => {
    if (activeTab !== 'interventions') return;
    fetchInterventions();
  }, [activeTab, fetchInterventions]);

  const loadComparisons = useCallback(async () => {
    setComparisonsLoading(true);
    try {
      const result = await fetchComparison({ year: comparisonYear });
      setComparisons(result);
    } finally {
      setComparisonsLoading(false);
    }
  }, [fetchComparison, comparisonYear]);

  const handleOpenIntervention = useCallback((intervention: CurriculumIntervention) => {
    setSelectedIntervention(intervention);
    setInterventionDialogOpen(true);
  }, []);

  const handleUpdateIntervention = useCallback(
    async (id: string, status: InterventionStatus, notes?: string) => {
      setSaving(true);
      try {
        await updateIntervention(id, { status, notes });
        toast.success('Intervention updated');
        setInterventionDialogOpen(false);
        setSelectedIntervention(null);
        await fetchInterventions();
      } catch (err: unknown) {
        toast.error('Failed to update intervention');
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
    [updateIntervention, fetchInterventions],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum Pacing"
        description="Monitor pacing progress, benchmarks, and interventions"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="benchmarks">
            <Target className="h-4 w-4 mr-1.5" />
            Benchmarks
          </TabsTrigger>
          <TabsTrigger value="interventions">
            <Lightbulb className="h-4 w-4 mr-1.5" />
            Interventions
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ─────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {overviewLoading ? (
            <LoadingSpinner />
          ) : overview ? (
            <>
              <PacingOverviewCards overview={overview} />
              <PacingTrafficLight overview={overview} />
            </>
          ) : (
            <EmptyState
              icon={LayoutDashboard}
              title="No overview data"
              description="Pacing overview is not available yet."
            />
          )}
        </TabsContent>

        {/* ── Benchmarks Tab ───────────────────────────────────────────── */}
        <TabsContent value="benchmarks" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Year</span>
            <Select
              value={String(comparisonYear)}
              onValueChange={(v: string) => setComparisonYear(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {comparisonsLoading ? (
            <LoadingSpinner />
          ) : comparisons.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No comparisons"
              description="No benchmark comparison data found for this year."
            />
          ) : (
            <BenchmarkComparisonTable comparisons={comparisons} />
          )}
        </TabsContent>

        {/* ── Interventions Tab ────────────────────────────────────────── */}
        <TabsContent value="interventions" className="space-y-4 mt-4">
          {interventionsLoading ? (
            <LoadingSpinner />
          ) : interventions.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="No interventions"
              description="There are no active interventions at this time."
            />
          ) : (
            <InterventionList
              interventions={interventions}
              onAction={handleOpenIntervention}
            />
          )}
        </TabsContent>
      </Tabs>

      <InterventionDialog
        open={interventionDialogOpen}
        onOpenChange={setInterventionDialogOpen}
        intervention={selectedIntervention}
        onSubmit={handleUpdateIntervention}
        saving={saving}
      />
    </div>
  );
}
