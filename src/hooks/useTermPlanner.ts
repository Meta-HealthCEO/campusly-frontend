import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { AssessmentPlan, DateClash, WeightingInfo, PlannedAssessment } from '@/types';
import type { SchoolClass, Subject } from '@/types';

export function useTermPlanner() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [plan, setPlan] = useState<AssessmentPlan | null>(null);
  const [clashes, setClashes] = useState<DateClash[]>([]);
  const [weightings, setWeightings] = useState<WeightingInfo[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );

  // Load classes and subjects on mount
  useEffect(() => {
    async function fetchRefs() {
      try {
        const [classRes, subjectRes] = await Promise.all([
          apiClient.get('/academic/classes'),
          apiClient.get('/academic/subjects'),
        ]);
        setClasses(unwrapList<SchoolClass>(classRes));
        setSubjects(unwrapList<Subject>(subjectRes));
      } catch (err: unknown) {
        console.error('Failed to load reference data', err);
      }
    }
    fetchRefs();
  }, []);

  const fetchPlan = useCallback(async () => {
    if (!selectedClass || !selectedTerm || !selectedYear) return;
    try {
      setLoading(true);
      const res = await apiClient.get(
        `/teacher-workbench/planner/${selectedClass}/${selectedTerm}/${selectedYear}`,
      );
      const data = unwrapResponse<AssessmentPlan>(res);
      setPlan(data);
    } catch (err: unknown) {
      console.error('Failed to load plan', err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedTerm, selectedYear]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const fetchWeightings = useCallback(async () => {
    if (!plan?.subjectId) return;
    try {
      const res = await apiClient.get(
        `/teacher-workbench/planner/weightings/${plan.subjectId}`,
      );
      const raw = unwrapResponse(res) as Record<string, unknown>;
      // Backend returns { subjectId, totalPlanned, byType } — wrap in array for UI
      setWeightings([{
        subjectId: String(raw.subjectId ?? ''),
        subjectName: '',
        requiredFormalWeight: 0,
        actualFormalWeight: Number(raw.totalPlanned ?? 0),
        requiredInformalWeight: 0,
        actualInformalWeight: 0,
        totalWeight: Number(raw.totalPlanned ?? 0),
      }]);
    } catch (err: unknown) {
      console.error('Failed to load weightings', err);
    }
  }, [plan?.subjectId]);

  useEffect(() => {
    fetchWeightings();
  }, [fetchWeightings]);

  const checkClashes = useCallback(async (date: string) => {
    if (!selectedClass) return;
    try {
      const res = await apiClient.get(
        `/teacher-workbench/planner/clashes/${selectedClass}/${date}`,
      );
      setClashes(unwrapList<DateClash>(res));
    } catch (err: unknown) {
      console.error('Failed to check clashes', err);
    }
  }, [selectedClass]);

  const savePlan = useCallback(
    async (data: Partial<AssessmentPlan> & { plannedAssessments: PlannedAssessment[] }) => {
      try {
        setSaving(true);
        await apiClient.post('/teacher-workbench/planner', {
          schoolId,
          classId: selectedClass,
          term: Number(selectedTerm),
          year: Number(selectedYear),
          ...data,
        });
        toast.success('Plan saved successfully');
        await fetchPlan();
      } catch (err: unknown) {
        console.error('Failed to save plan', err);
        toast.error('Failed to save plan');
      } finally {
        setSaving(false);
      }
    },
    [schoolId, selectedClass, selectedTerm, selectedYear, fetchPlan],
  );

  return {
    plan,
    clashes,
    weightings,
    classes,
    subjects,
    loading,
    saving,
    selectedClass,
    selectedTerm,
    selectedYear,
    setSelectedClass,
    setSelectedTerm,
    setSelectedYear,
    fetchPlan,
    savePlan,
    checkClashes,
    fetchWeightings,
  };
}
