import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, resolveField, resolveId, unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type {
  AssessmentPlan,
  AssessmentPlanType,
  CurriculumTopic,
  DateClash,
  PlannedAssessment,
  SchoolClass,
  Subject,
  WeightingInfo,
} from '@/types';

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface PlannerClassOption {
  id: string;
  name: string;
  gradeLevel?: number;
  subjects: SubjectOption[];
}

interface RawPlannedAssessment {
  title?: string;
  type?: AssessmentPlanType;
  assessmentType?: AssessmentPlanType;
  plannedDate?: string;
  marks?: number;
  totalMarks?: number;
  weight?: number;
  topicIds?: unknown[];
  assessmentId?: string | null;
  linkedPaperId?: string | null;
  status?: PlannedAssessment['status'];
}

interface RawWeightSummary {
  subjectId?: string;
  subjectName?: string;
  totalWeight?: number;
  totalRequiredWeight?: number;
  assessmentCount?: number;
  byType?: Partial<Record<AssessmentPlanType, number>>;
  requiredByType?: Partial<Record<AssessmentPlanType, number>>;
}

const FORMAL_TYPES: AssessmentPlanType[] = ['test', 'exam', 'practical', 'project'];
const INFORMAL_TYPES: AssessmentPlanType[] = ['assignment'];

function getClassLabel(classInfo: SchoolClass): string {
  const gradeName =
    resolveField<string>(classInfo.gradeId, 'name') ??
    resolveField<string>(classInfo.grade, 'name') ??
    classInfo.gradeName ??
    '';
  return [gradeName, classInfo.name].filter(Boolean).join(' ') || 'Class';
}

function getClassGradeLevel(classInfo: SchoolClass): number | undefined {
  return (
    resolveField<number>(classInfo.gradeId, 'level') ??
    resolveField<number>(classInfo.grade, 'level') ??
    undefined
  );
}

function normalizeSubject(subject: Subject | SubjectOption | null | undefined): SubjectOption | null {
  if (!subject) return null;
  const id = resolveId(subject);
  if (!id) return null;
  return {
    id,
    name: subject.name ?? 'Subject',
    code: subject.code ?? '',
  };
}

function normalizeAssessment(raw: RawPlannedAssessment): PlannedAssessment {
  const type = raw.type ?? raw.assessmentType ?? 'test';
  return {
    title: raw.title ?? 'Untitled assessment',
    type,
    assessmentType: type,
    plannedDate: raw.plannedDate ? raw.plannedDate.slice(0, 10) : '',
    marks: raw.marks ?? raw.totalMarks ?? 0,
    totalMarks: raw.totalMarks ?? raw.marks ?? 0,
    weight: raw.weight ?? 0,
    topicIds: (raw.topicIds ?? []).map((item) => resolveId(item as never)).filter(Boolean),
    assessmentId: raw.assessmentId ?? raw.linkedPaperId ?? null,
    linkedPaperId: raw.linkedPaperId ?? raw.assessmentId ?? null,
    status: raw.status ?? 'planned',
  };
}

function normalizePlan(plan: AssessmentPlan | null, selectedSubject: string): AssessmentPlan | null {
  if (!plan) return null;
  return {
    ...plan,
    subjectId: resolveId(plan.subjectId as never) || selectedSubject,
    plannedAssessments: (plan.plannedAssessments ?? []).map((assessment) =>
      normalizeAssessment(assessment as RawPlannedAssessment),
    ),
  };
}

function sumWeights(types: AssessmentPlanType[], byType?: Partial<Record<AssessmentPlanType, number>>): number {
  return types.reduce((sum, type) => sum + Number(byType?.[type] ?? 0), 0);
}

function normalizeWeighting(raw: RawWeightSummary, selectedSubject: string): WeightingInfo {
  const byType = raw.byType ?? {};
  const requiredByType = raw.requiredByType ?? {};
  return {
    subjectId: raw.subjectId ?? selectedSubject,
    subjectName: raw.subjectName ?? 'Selected subject',
    requiredFormalWeight: sumWeights(FORMAL_TYPES, requiredByType),
    actualFormalWeight: sumWeights(FORMAL_TYPES, byType),
    requiredInformalWeight: sumWeights(INFORMAL_TYPES, requiredByType),
    actualInformalWeight: sumWeights(INFORMAL_TYPES, byType),
    totalWeight: Number(raw.totalWeight ?? 0),
    totalRequiredWeight: Number(raw.totalRequiredWeight ?? 0),
    assessmentCount: Number(raw.assessmentCount ?? 0),
    byType,
    requiredByType,
  };
}

export function useTermPlanner() {
  const { entries, loading: loadingTeachingLoad } = useTeacherClasses();

  const [plan, setPlan] = useState<AssessmentPlan | null>(null);
  const [clashes, setClashes] = useState<DateClash[]>([]);
  const [weightings, setWeightings] = useState<WeightingInfo[]>([]);
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedClassOverride, setSelectedClass] = useState('');
  const [selectedSubjectOverride, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );

  const classes = useMemo<PlannerClassOption[]>(() => {
    const byClass = new Map<string, PlannerClassOption>();

    for (const entry of entries) {
      const classId = resolveId(entry.class);
      if (!classId) continue;

      if (!byClass.has(classId)) {
        byClass.set(classId, {
          id: classId,
          name: getClassLabel(entry.class),
          gradeLevel: getClassGradeLevel(entry.class),
          subjects: [],
        });
      }

      const subject = normalizeSubject(entry.subject);
      if (!subject) continue;

      const classOption = byClass.get(classId)!;
      if (!classOption.subjects.some((item) => item.id === subject.id)) {
        classOption.subjects.push(subject);
      }
    }

    return [...byClass.values()]
      .map((classOption) => ({
        ...classOption,
        subjects: classOption.subjects.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const selectedClass = useMemo(() => {
    if (classes.length === 0) return '';
    if (selectedClassOverride && classes.some((classOption) => classOption.id === selectedClassOverride)) {
      return selectedClassOverride;
    }
    return classes[0].id;
  }, [classes, selectedClassOverride]);

  const selectedClassInfo = useMemo(
    () => classes.find((classOption) => classOption.id === selectedClass) ?? null,
    [classes, selectedClass],
  );

  const subjects = useMemo(
    () => selectedClassInfo?.subjects ?? [],
    [selectedClassInfo],
  );

  const selectedSubject = useMemo(() => {
    if (subjects.length === 0) return '';
    if (selectedSubjectOverride && subjects.some((subject) => subject.id === selectedSubjectOverride)) {
      return selectedSubjectOverride;
    }
    return subjects[0].id;
  }, [selectedSubjectOverride, subjects]);

  const fetchPlan = useCallback(async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm || !selectedYear) {
      setPlan(null);
      setWeightings([]);
      return null;
    }

    setLoading(true);
    try {
      const res = await apiClient.get(
        `/teacher-workbench/planner/${selectedClass}/${selectedTerm}/${selectedYear}`,
        { params: { subjectId: selectedSubject } },
      );
      const data = normalizePlan(unwrapResponse<AssessmentPlan | null>(res), selectedSubject);
      setPlan(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to load term plan', err);
      setPlan(null);
      toast.error(extractErrorMessage(err, 'Failed to load term plan'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedYear]);

  useEffect(() => {
    const run = window.setTimeout(() => {
      void fetchPlan();
    }, 0);
    return () => window.clearTimeout(run);
  }, [fetchPlan]);

  const fetchWeightings = useCallback(async () => {
    if (!selectedSubject || !selectedClass || !selectedTerm || !selectedYear) {
      setWeightings([]);
      return;
    }

    try {
      const res = await apiClient.get(
        `/teacher-workbench/planner/weightings/${selectedSubject}`,
        {
          params: {
            classId: selectedClass,
            term: selectedTerm,
            year: selectedYear,
          },
        },
      );
      setWeightings([normalizeWeighting(unwrapResponse<RawWeightSummary>(res), selectedSubject)]);
    } catch (err: unknown) {
      console.error('Failed to load weightings', err);
      setWeightings([]);
    }
  }, [selectedClass, selectedSubject, selectedTerm, selectedYear]);

  useEffect(() => {
    const run = window.setTimeout(() => {
      void fetchWeightings();
    }, 0);
    return () => window.clearTimeout(run);
  }, [fetchWeightings]);

  const fetchTopics = useCallback(async () => {
    if (!selectedSubject || !selectedTerm || !selectedClassInfo?.gradeLevel) {
      setTopics([]);
      return;
    }

    setLoadingTopics(true);
    try {
      const res = await apiClient.get('/teacher-workbench/curriculum/topics', {
        params: {
          subjectId: selectedSubject,
          term: selectedTerm,
          gradeLevel: selectedClassInfo.gradeLevel,
        },
      });
      setTopics(
        unwrapList<CurriculumTopic>(res).map((topic) => ({
          ...topic,
          id: topic.id ?? topic._id ?? '',
          title: topic.title ?? topic.name,
        })),
      );
    } catch (err: unknown) {
      console.error('Failed to load planner topics', err);
      setTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  }, [selectedClassInfo?.gradeLevel, selectedSubject, selectedTerm]);

  useEffect(() => {
    const run = window.setTimeout(() => {
      void fetchTopics();
    }, 0);
    return () => window.clearTimeout(run);
  }, [fetchTopics]);

  const checkClashes = useCallback(async (date: string) => {
    if (!selectedClass) return;
    try {
      const res = await apiClient.get(
        `/teacher-workbench/planner/clashes/${selectedClass}/${date}`,
      );
      setClashes(unwrapList<DateClash>(res));
    } catch (err: unknown) {
      console.error('Failed to check clashes', err);
      setClashes([]);
    }
  }, [selectedClass]);

  const savePlan = useCallback(
    async (data: Partial<AssessmentPlan> & { plannedAssessments: PlannedAssessment[] }) => {
      if (!selectedClass || !selectedSubject || !selectedTerm || !selectedYear) {
        toast.error('Please select a class, subject, term, and year.');
        return null;
      }

      setSaving(true);
      try {
        const res = await apiClient.post('/teacher-workbench/planner', {
          classId: selectedClass,
          subjectId: selectedSubject,
          term: Number(selectedTerm),
          year: Number(selectedYear),
          plannedAssessments: data.plannedAssessments.map((assessment) => ({
            title: assessment.title,
            type: assessment.type,
            plannedDate: assessment.plannedDate,
            marks: assessment.marks,
            weight: assessment.weight,
            topicIds: assessment.topicIds,
            assessmentId: assessment.assessmentId,
            status: assessment.status,
          })),
        });
        const savedPlan = normalizePlan(unwrapResponse<AssessmentPlan>(res), selectedSubject);
        setPlan(savedPlan);
        toast.success('Plan saved successfully');
        await fetchWeightings();
        return savedPlan;
      } catch (err: unknown) {
        console.error('Failed to save plan', err);
        toast.error(extractErrorMessage(err, 'Failed to save plan'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [fetchWeightings, selectedClass, selectedSubject, selectedTerm, selectedYear],
  );

  const setClassAndResetSubject = useCallback((classId: string) => {
    setSelectedClass(classId);
    setSelectedSubject('');
  }, []);

  return {
    plan,
    clashes,
    weightings,
    classes,
    subjects,
    topics,
    loading: loading || loadingTeachingLoad,
    loadingTopics,
    saving,
    selectedClass,
    selectedSubject,
    selectedTerm,
    selectedYear,
    setSelectedClass: setClassAndResetSubject,
    setSelectedSubject,
    setSelectedTerm,
    setSelectedYear,
    fetchPlan,
    savePlan,
    checkClashes,
    fetchWeightings,
  };
}
