'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useHODDashboard } from '@/hooks/useHODDashboard';
import { useTeacherObservations } from '@/hooks/useTeacherObservations';
import { useCommonAssessments } from '@/hooks/useCommonAssessments';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DepartmentOverviewCards, SubjectPerformanceTable,
  ModerationQueueTable, WorkloadChart, WorkloadTable,
  ObservationTable, ObservationForm, CommonAssessmentChart,
  CurriculumPacingList, ScheduleObservationDialog,
} from '@/components/hod';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { TeacherObservation, UpdateObservationPayload, CreateObservationPayload } from '@/types';

export default function HODDashboardPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const departmentId = permissions.departmentId;

  const {
    performance, pacing, workload, moderation, loading,
    fetchPerformance, fetchPacing, fetchWorkload, fetchModeration,
  } = useHODDashboard(departmentId);

  const {
    observations, loading: obsLoading,
    fetchObservations, createObservation, updateObservation, deleteObservation,
  } = useTeacherObservations(departmentId);

  const { results: commonResults, loading: caLoading, fetchCommonAssessments } = useCommonAssessments(departmentId);

  const [activeTab, setActiveTab] = useState<string | number>('overview');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedObs, setSelectedObs] = useState<TeacherObservation | null>(null);

  // ─── Load data per tab ────────────────────────────────────────────────
  useEffect(() => {
    if (!departmentId) return;
    if (activeTab === 'performance') fetchPerformance(departmentId);
    if (activeTab === 'pacing') fetchPacing(departmentId);
    if (activeTab === 'workload') fetchWorkload(departmentId);
    if (activeTab === 'moderation') fetchModeration(departmentId);
    if (activeTab === 'observations') fetchObservations();
    if (activeTab === 'common') fetchCommonAssessments();
  }, [activeTab, departmentId, fetchPerformance, fetchPacing, fetchWorkload, fetchModeration, fetchObservations, fetchCommonAssessments]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleApprove = useCallback(async (paperId: string) => {
    toast.info(`Approve paper ${paperId} — integrate with Teacher Workbench moderation endpoint`);
  }, []);

  const handleRequestChanges = useCallback(async (paperId: string) => {
    toast.info(`Request changes for paper ${paperId}`);
  }, []);

  const handleScheduleObs = useCallback(async (data: CreateObservationPayload) => {
    setSaving(true);
    try {
      await createObservation(data);
      toast.success('Observation scheduled');
      fetchObservations();
    } catch (err: unknown) {
      toast.error('Failed to schedule observation');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [createObservation, fetchObservations]);

  const handleCompleteObs = useCallback(async (data: UpdateObservationPayload) => {
    if (!selectedObs) return;
    setSaving(true);
    try {
      await updateObservation(selectedObs.id, data);
      toast.success('Observation completed');
      setSelectedObs(null);
      fetchObservations();
    } catch (err: unknown) {
      toast.error('Failed to complete observation');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [selectedObs, updateObservation, fetchObservations]);

  if (loading) return <LoadingSpinner />;

  if (!departmentId) {
    return (
      <div className="p-6">
        <PageHeader title="HOD Oversight" />
        <p className="mt-4 text-muted-foreground">
          You are not assigned as Head of Department. Contact your school admin.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="HOD Oversight" />

      <Tabs value={String(activeTab)} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="pacing">Pacing</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="common">Common Assessments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <DepartmentOverviewCards
            performance={performance}
            moderation={moderation}
            workload={workload}
          />
          {performance && <SubjectPerformanceTable subjects={performance.subjects} />}
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          {performance && <SubjectPerformanceTable subjects={performance.subjects} />}
        </TabsContent>

        <TabsContent value="pacing" className="mt-4">
          <CurriculumPacingList pacing={pacing} />
        </TabsContent>

        <TabsContent value="moderation" className="mt-4">
          <ModerationQueueTable
            items={moderation?.items ?? []}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
          />
        </TabsContent>

        <TabsContent value="workload" className="space-y-4 mt-4">
          <WorkloadChart workload={workload} />
          <WorkloadTable workload={workload} />
        </TabsContent>

        <TabsContent value="observations" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setScheduleOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Schedule Observation
            </Button>
          </div>
          {obsLoading ? <LoadingSpinner /> : (
            <ObservationTable observations={observations} onSelect={setSelectedObs} />
          )}
          {selectedObs && selectedObs.status === 'scheduled' && (
            <ObservationForm
              focusAreas={selectedObs.focusAreas}
              onSubmit={handleCompleteObs}
              saving={saving}
            />
          )}
          <ScheduleObservationDialog
            open={scheduleOpen}
            onOpenChange={setScheduleOpen}
            onSubmit={handleScheduleObs}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="common" className="mt-4">
          {caLoading ? <LoadingSpinner /> : (
            <CommonAssessmentChart results={commonResults} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
