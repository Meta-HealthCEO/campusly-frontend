'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  FileText,
  Loader2,
  NotebookPen,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CurriculumTreeBrowser } from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { PreviewStep } from '@/components/content/ai-studio';
import { AssignHomeworkDialog } from '@/components/homework/AssignHomeworkDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAssignHomework } from '@/hooks/useAssignHomework';
import { useGrades, useSubjects } from '@/hooks/useAcademics';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, resolveId, unwrapResponse } from '@/lib/api-helpers';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import type { AssignHomeworkFormValues } from '@/components/homework/AssignHomeworkDialog';
import type {
  ContentBlockType,
  ContentResourceItem,
  CurriculumFrameworkItem,
  CurriculumNodeItem,
  GenerateContentPayload,
  Grade,
  ResourceType,
  Subject,
  UpdateResourcePayload,
} from '@/types';
import type {
  BloomsLevel,
  CapsLevel,
  CognitiveLevelPair,
  QuestionItem,
  QuestionType,
} from '@/types/question-bank';
import type { AIPaperSectionConfig, PaperDifficulty, PaperType } from '@/types/papers';

type CreationKind = 'resource' | 'homework' | 'paper' | 'lesson_plan' | 'questions';
type CurriculumContextStatus = 'idle' | 'preparing' | 'ready' | 'error';

interface CurriculumGenerationContext {
  subjectCode: string;
  subjectName: string;
  gradeLevel: number;
  gradeName: string;
  term: number;
}

type StudioResult =
  | { kind: 'resource'; resource: ContentResourceItem }
  | { kind: 'paper'; id: string; title: string }
  | { kind: 'questions'; count: number };

type AcademicGradeRecord = Grade & {
  _id?: string;
  orderIndex?: number;
};

type AcademicSubjectRecord = Subject & {
  _id?: string;
  gradeIds?: Array<string | { id?: string; _id?: string }>;
};

const STEPS = [
  { number: 1, label: 'Create' },
  { number: 2, label: 'Curriculum' },
  { number: 3, label: 'Details' },
  { number: 4, label: 'Generate' },
];

const OUTPUTS: Array<{
  kind: CreationKind;
  title: string;
  description: string;
  destination: string;
  icon: typeof Sparkles;
  badge?: string;
}> = [
  {
    kind: 'lesson_plan',
    title: 'Lesson Plan',
    description: 'Plan objectives, activities, timing, resources, and homework ideas.',
    destination: 'Save now, print/export later',
    icon: NotebookPen,
    badge: 'Legacy — opens the new Lesson Workspace',
  },
  {
    kind: 'resource',
    title: 'Lesson Material',
    description: 'Create a lesson, worksheet, activity, study notes, or worked example.',
    destination: 'Printable/PDF-ready resource',
    icon: Sparkles,
    badge: 'AI',
  },
  {
    kind: 'homework',
    title: 'Homework',
    description: 'Create homework from the curriculum, then assign it to a class.',
    destination: 'Print/PDF first, assign online later',
    icon: ClipboardList,
    badge: 'AI',
  },
  {
    kind: 'paper',
    title: 'Test or Exam Paper',
    description: 'Generate a CAPS-aligned paper and memo from one or more topics.',
    destination: 'Paper PDF and Memo PDF',
    icon: FileText,
    badge: 'AI',
  },
  {
    kind: 'questions',
    title: 'Practice Questions',
    description: 'Create reusable questions for revision, homework, and future papers.',
    destination: 'Reusable for papers and revision',
    icon: FileQuestion,
    badge: 'AI',
  },
];

const RESOURCE_TYPES: Array<{ value: ResourceType; label: string; description: string }> = [
  { value: 'lesson', label: 'Lesson', description: 'Explanations, examples, checks, and practice.' },
  { value: 'worksheet', label: 'Worksheet', description: 'Printable or assignable practice work.' },
  { value: 'activity', label: 'Activity', description: 'Classroom task, group work, or interactive activity.' },
  { value: 'study_notes', label: 'Study Notes', description: 'Structured revision notes for learners.' },
  { value: 'worked_example', label: 'Worked Example', description: 'Step-by-step model solution.' },
];

const BLOCK_TYPES_BY_RESOURCE: Record<ResourceType, ContentBlockType[]> = {
  lesson: ['text', 'quiz', 'fill_blank', 'step_reveal', 'image'],
  worksheet: ['text', 'quiz', 'fill_blank', 'match_columns', 'ordering'],
  activity: ['text', 'quiz', 'fill_blank', 'match_columns', 'image'],
  study_notes: ['text', 'image', 'quiz', 'step_reveal'],
  worked_example: ['text', 'step_reveal', 'quiz', 'image'],
};

const DIFFICULTIES = [
  { value: 1, label: 'Foundation' },
  { value: 3, label: 'Standard' },
  { value: 5, label: 'Advanced' },
];

const PAPER_TYPES: Array<{ value: PaperType; label: string }> = [
  { value: 'class_test', label: 'Class Test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'mid_year', label: 'Mid-Year Exam' },
  { value: 'trial', label: 'Trial Exam' },
  { value: 'final', label: 'Final Exam' },
  { value: 'custom', label: 'Custom Paper' },
];

const PAPER_DIFFICULTIES: Array<{ value: PaperDifficulty; label: string }> = [
  { value: 'easy', label: 'Foundation' },
  { value: 'medium', label: 'Standard' },
  { value: 'hard', label: 'Advanced' },
];

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'structured', label: 'Structured' },
  { value: 'essay', label: 'Essay' },
  { value: 'match', label: 'Matching' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'diagram_label', label: 'Diagram Labelling' },
  { value: 'case_study', label: 'Case Study' },
];

const CAPS_LEVELS: Array<{ value: CapsLevel; label: string }> = [
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'routine', label: 'Routine Procedures' },
  { value: 'complex', label: 'Complex Procedures' },
  { value: 'problem_solving', label: 'Problem Solving' },
];

const BLOOMS_LEVELS: Array<{ value: BloomsLevel; label: string }> = [
  { value: 'remember', label: 'Remember' },
  { value: 'understand', label: 'Understand' },
  { value: 'apply', label: 'Apply' },
  { value: 'analyse', label: 'Analyse' },
  { value: 'evaluate', label: 'Evaluate' },
  { value: 'create', label: 'Create' },
];

const CAPS_SUBJECT_NAMES: Record<string, string> = {
  ACCOUNTING: 'Accounting',
  AFRIKAANSFAL: 'Afrikaans Eerste Addisionele Taal',
  AFRIKAANSHL: 'Afrikaans Huistaal',
  BUSINESSSTUDIES: 'Business Studies',
  CAT: 'Computer Applications Technology',
  ECONOMICS: 'Economics',
  EMS: 'Economic and Management Sciences',
  ENGLISHFAL: 'English First Additional Language',
  ENGLISHHL: 'English Home Language',
  GEOGRAPHY: 'Geography',
  HISTORY: 'History',
  IT: 'Information Technology',
  LIFEORIENTATION: 'Life Orientation',
  LIFESCI: 'Life Sciences',
  LIFESKILLS: 'Life Skills',
  MATHEMATICS: 'Mathematics',
  MATHLIT: 'Mathematical Literacy',
  NATSCIENCES: 'Natural Sciences',
  NSTECH: 'Natural Sciences and Technology',
  PHYSSCI: 'Physical Sciences',
  SOCIALSCIENCES: 'Social Sciences',
  TECHNOLOGY: 'Technology',
  TOURISM: 'Tourism',
  VISUALARTS: 'Creative Arts: Visual Arts',
};

const ACADEMIC_SUBJECT_CODES: Record<string, string> = {
  ACCOUNTING: 'ACC',
  AFRIKAANSFAL: 'AFR-FAL',
  AFRIKAANSHL: 'AFR-HL',
  BUSINESSSTUDIES: 'BUS',
  CAT: 'CAT',
  ECONOMICS: 'ECO',
  EMS: 'EMS',
  ENGLISHFAL: 'ENG-FAL',
  ENGLISHHL: 'ENG-HL',
  GEOGRAPHY: 'GEO',
  HISTORY: 'HIS',
  IT: 'IT',
  LIFEORIENTATION: 'LO',
  LIFESCI: 'LIF',
  LIFESKILLS: 'LSK',
  MATHEMATICS: 'MAT',
  MATHLIT: 'MLIT',
  NATSCIENCES: 'NS',
  NSTECH: 'NSTECH',
  PHYSSCI: 'PHY',
  SOCIALSCIENCES: 'SS',
  TECHNOLOGY: 'TECH',
  TOURISM: 'TOU',
  VISUALARTS: 'ART',
};

function normalizeMatchText(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleCaseCode(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferTerm(node: CurriculumNodeItem): number | null {
  const source = `${node.code} ${node.title}`;
  const match = source.match(/(?:^|[-\s])T(?:ERM)?\s*(\d)(?:$|[-\s])/i)
    ?? source.match(/\bterm\s*(\d)\b/i);
  if (!match) return null;
  const term = Number(match[1]);
  return term >= 1 && term <= 4 ? term : null;
}

function extractCurriculumContext(node: CurriculumNodeItem): CurriculumGenerationContext | null {
  const source = `${node.code} ${node.title}`;
  const gradeMatch = source.match(/\bGR(?:ADE)?\s*0?(\d{1,2})\b/i)
    ?? source.match(/\bgrade\s*0?(\d{1,2})\b/i);
  const subjectMatch = node.code.match(/^CAPS-(.+?)-GR\d{1,2}(?:-|$)/i);
  const term = inferTerm(node);

  if (!gradeMatch || !subjectMatch || !term) return null;

  const subjectCode = subjectMatch[1].replace(/[^a-z0-9]/gi, '').toUpperCase();
  const gradeLevelValue = Number(gradeMatch[1]);
  if (!subjectCode || !Number.isFinite(gradeLevelValue)) return null;

  return {
    subjectCode,
    subjectName: CAPS_SUBJECT_NAMES[subjectCode] ?? titleCaseCode(subjectMatch[1]),
    gradeLevel: gradeLevelValue,
    gradeName: `Grade ${gradeLevelValue}`,
    term,
  };
}

function contextsMatch(a: CurriculumGenerationContext, b: CurriculumGenerationContext): boolean {
  return a.subjectCode === b.subjectCode
    && a.gradeLevel === b.gradeLevel
    && a.term === b.term;
}

function academicSubjectCode(context: CurriculumGenerationContext): string {
  return ACADEMIC_SUBJECT_CODES[context.subjectCode]
    ?? context.subjectCode.slice(0, 8)
    ?? normalizeMatchText(context.subjectName).slice(0, 8).toUpperCase();
}

function gradeLevel(grade: AcademicGradeRecord): number | null {
  if (typeof grade.level === 'number') return grade.level;
  if (typeof grade.orderIndex === 'number') return grade.orderIndex;
  const match = grade.name.match(/\b(?:Grade\s*)?0?(\d{1,2})\b/i);
  return match ? Number(match[1]) : null;
}

function findMatchingGrade(
  grades: Grade[],
  context: CurriculumGenerationContext,
): AcademicGradeRecord | undefined {
  return (grades as AcademicGradeRecord[]).find((grade) => (
    gradeLevel(grade) === context.gradeLevel
    || normalizeMatchText(grade.name) === normalizeMatchText(context.gradeName)
  ));
}

function findMatchingSubject(
  subjects: Subject[],
  context: CurriculumGenerationContext,
): AcademicSubjectRecord | undefined {
  const code = academicSubjectCode(context);
  return (subjects as AcademicSubjectRecord[]).find((subject) => {
    const subjectName = normalizeMatchText(subject.name);
    const subjectCode = normalizeMatchText(subject.code);
    return subjectName === normalizeMatchText(context.subjectName)
      || subjectCode === normalizeMatchText(code)
      || subjectCode === normalizeMatchText(context.subjectCode);
  });
}

function subjectGradeIds(subject: AcademicSubjectRecord): string[] {
  return (subject.gradeIds ?? []).map((gradeRef) => resolveId(gradeRef)).filter(Boolean);
}

function paperTypeLabel(value: PaperType): string {
  return PAPER_TYPES.find((type) => type.value === value)?.label ?? 'Paper';
}

function buildPaperSections(totalMarks: number): AIPaperSectionConfig[] {
  if (totalMarks <= 35) {
    return [{
      title: 'Section A',
      instructions: 'Answer all questions.',
      questionCount: Math.max(4, Math.round(totalMarks / 5)),
      sectionMarks: totalMarks,
    }];
  }

  const sectionA = Math.max(10, Math.round(totalMarks * 0.4));
  const sectionB = Math.max(10, Math.round(totalMarks * 0.4));
  const sectionC = Math.max(1, totalMarks - sectionA - sectionB);

  return [
    {
      title: 'Section A',
      instructions: 'Core knowledge and routine questions.',
      questionCount: Math.max(4, Math.round(sectionA / 4)),
      sectionMarks: sectionA,
    },
    {
      title: 'Section B',
      instructions: 'Application and structured questions.',
      questionCount: Math.max(2, Math.round(sectionB / 8)),
      sectionMarks: sectionB,
    },
    {
      title: 'Section C',
      instructions: 'Extended or higher-order question.',
      questionCount: Math.max(1, Math.round(sectionC / 12)),
      sectionMarks: sectionC,
    },
  ];
}

function UnifiedStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Quick Make progress">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const complete = currentStep > step.number;
          const current = currentStep === step.number;
          return (
            <li key={step.number} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                    complete && 'bg-primary text-primary-foreground',
                    current && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !complete && !current && 'bg-muted text-muted-foreground',
                  )}
                >
                  {complete ? <Check className="h-4 w-4" /> : step.number}
                </span>
                <span className={cn('hidden text-xs font-medium sm:inline', current ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn('hidden h-0.5 flex-1 rounded-full sm:block', complete ? 'bg-primary' : 'bg-muted')} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ContextStatusBadge({
  status,
  error,
}: {
  status: CurriculumContextStatus;
  error: string | null;
}) {
  if (status === 'ready') {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ready
      </Badge>
    );
  }
  if (status === 'preparing') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Preparing context
      </Badge>
    );
  }
  if (status === 'error') {
    return (
      <span className="text-sm text-destructive">
        {error ?? 'This curriculum selection is missing subject, grade, or term context.'}
      </span>
    );
  }
  return null;
}

export default function AiStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToolHandledRef = useRef(false);
  const { user, permissions } = useAuthStore();
  const {
    frameworks,
    selectedFramework,
    loading: frameworksLoading,
    searchNodes,
    loadNode,
  } = useCurriculumStructure();
  const {
    generateContent,
    submitForReview,
    reviewResource,
    refineResource,
    updateResource,
  } = useContentLibrary();
  const { generatePaperWithAI } = useTeacherPapers(false);
  const { subjects, loading: subjectsLoading, refetch: refetchSubjects } = useSubjects();
  const { grades, loading: gradesLoading, refetch: refetchGrades } = useGrades();
  const { classes, assignHomework } = useAssignHomework();

  const [step, setStep] = useState(1);
  const [selectedOutput, setSelectedOutput] = useState<CreationKind | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<CurriculumNodeItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [curriculumContext, setCurriculumContext] = useState<CurriculumGenerationContext | null>(null);
  const [contextStatus, setContextStatus] = useState<CurriculumContextStatus>('idle');
  const [contextError, setContextError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [term, setTerm] = useState(0);
  const preparedContextKeyRef = useRef<string | null>(null);

  const [resourceType, setResourceType] = useState<ResourceType>('lesson');
  const [difficulty, setDifficulty] = useState(3);
  const [instructions, setInstructions] = useState('');

  const [paperType, setPaperType] = useState<PaperType>('class_test');
  const [paperTitle, setPaperTitle] = useState('');
  const [paperMarks, setPaperMarks] = useState(50);
  const [paperDuration, setPaperDuration] = useState(60);
  const [paperDifficulty, setPaperDifficulty] = useState<PaperDifficulty>('medium');
  const [paperYear, setPaperYear] = useState(new Date().getFullYear());

  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionCapsLevel, setQuestionCapsLevel] = useState<CapsLevel>('knowledge');
  const [questionBloomsLevel, setQuestionBloomsLevel] = useState<BloomsLevel>('understand');

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<StudioResult | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignResource, setAssignResource] = useState<ContentResourceItem | null>(null);

  const canApproveResources =
    user?.role === 'school_admin' ||
    user?.role === 'super_admin' ||
    permissions.isHOD ||
    permissions.isSchoolPrincipal;

  const selectedPrimaryNode = selectedNodes[0] ?? null;
  const selectedTopicIds = selectedNodes.map((node) => node.id);
  const selectedOutputMeta = OUTPUTS.find((output) => output.kind === selectedOutput);
  const allowMultipleTopics = selectedOutput === 'paper';
  const selectedFrameworkMeta = frameworks.find(
    (framework: CurriculumFrameworkItem) => framework.id === selectedFramework,
  );

  const computedPaperTitle = useMemo(() => {
    const explicit = paperTitle.trim();
    if (explicit) return explicit;
    return `Term ${term || 1} ${paperTypeLabel(paperType)} ${paperYear}`;
  }, [paperTitle, paperType, paperYear, term]);

  const canContinueFromCurriculum =
    selectedOutput !== null &&
    selectedNodes.length > 0 &&
    contextStatus === 'ready' &&
    Boolean(subjectId && gradeId && term);

  const canGenerate = canContinueFromCurriculum && !generating;

  const resetFlow = useCallback(() => {
    setStep(1);
    setSelectedOutput(null);
    setSelectedNodes([]);
    setSelectedNodeId(null);
    setCurriculumContext(null);
    setContextStatus('idle');
    setContextError(null);
    setSubjectId('');
    setGradeId('');
    setTerm(0);
    preparedContextKeyRef.current = null;
    setResourceType('lesson');
    setDifficulty(3);
    setInstructions('');
    setPaperType('class_test');
    setPaperTitle('');
    setPaperMarks(50);
    setPaperDuration(60);
    setPaperDifficulty('medium');
    setPaperYear(new Date().getFullYear());
    setQuestionType('mcq');
    setQuestionCount(5);
    setQuestionCapsLevel('knowledge');
    setQuestionBloomsLevel('understand');
    setResult(null);
  }, []);

  const chooseOutput = useCallback((kind: CreationKind) => {
    setSelectedOutput(kind);
    setResult(null);
    setSelectedNodes([]);
    setSelectedNodeId(null);
    setCurriculumContext(null);
    setContextStatus('idle');
    setContextError(null);
    setSubjectId('');
    setGradeId('');
    setTerm(0);
    preparedContextKeyRef.current = null;
    if (kind === 'homework') setResourceType('worksheet');
    setStep(2);
  }, []);

  useEffect(() => {
    if (initialToolHandledRef.current) return;
    const tool = searchParams.get('tool');
    const mapped: Partial<Record<string, CreationKind>> = {
      paper: 'paper',
      resource: 'resource',
      homework: 'homework',
      questions: 'questions',
    };
    if (!tool || !mapped[tool]) return;
    initialToolHandledRef.current = true;
    chooseOutput(mapped[tool]);
    router.replace('/teacher/quick-make');
  }, [chooseOutput, router, searchParams]);

  const setContextFromNodes = useCallback((nodes: CurriculumNodeItem[]) => {
    const primary = nodes[0] ?? null;
    setSelectedNodeId(primary?.id ?? null);
    preparedContextKeyRef.current = null;

    if (!primary) {
      setCurriculumContext(null);
      setContextStatus('idle');
      setContextError(null);
      setSubjectId('');
      setGradeId('');
      setTerm(0);
      return;
    }

    const context = extractCurriculumContext(primary);
    setCurriculumContext(context);
    setSubjectId('');
    setGradeId('');
    setTerm(context?.term ?? 0);

    if (!context) {
      setContextStatus('error');
      setContextError('Choose a CAPS topic or subtopic that includes a subject, grade, and term.');
      return;
    }

    setContextStatus('preparing');
    setContextError(null);
  }, []);

  const handleTopicSelect = useCallback((node: CurriculumNodeItem) => {
    const nextContext = extractCurriculumContext(node);
    if (!nextContext) {
      toast.error('Choose a CAPS topic or subtopic that includes subject, grade, and term.');
      return;
    }

    setSelectedNodes((prev) => {
      if (!allowMultipleTopics) {
        const next = [node];
        setContextFromNodes(next);
        return next;
      }

      const alreadySelected = prev.some((item) => item.id === node.id);
      const next = alreadySelected
        ? prev.filter((item) => item.id !== node.id)
        : [...prev, node];

      const primaryContext = prev[0] ? extractCurriculumContext(prev[0]) : nextContext;
      if (!alreadySelected && primaryContext && !contextsMatch(primaryContext, nextContext)) {
        toast.error('For one paper, choose topics from the same subject, grade, and term.');
        return prev;
      }

      setContextFromNodes(next);
      return next;
    });
  }, [allowMultipleTopics, setContextFromNodes]);

  useEffect(() => {
    if (!selectedPrimaryNode || !curriculumContext || !user?.schoolId || subjectsLoading || gradesLoading) {
      return;
    }

    const schoolId = user.schoolId;
    const context = curriculumContext;
    const contextKey = [
      selectedPrimaryNode.id,
      context.subjectCode,
      context.gradeLevel,
      context.term,
    ].join(':');

    if (preparedContextKeyRef.current === contextKey) return;
    preparedContextKeyRef.current = contextKey;

    let cancelled = false;

    async function prepareAcademicContext() {
      setContextStatus('preparing');
      setContextError(null);

      try {
        let grade = findMatchingGrade(grades, context);

        if (!grade) {
          const response = await apiClient.post('/academic/grades', {
            schoolId,
            name: context.gradeName,
            orderIndex: context.gradeLevel,
          });
          grade = unwrapResponse<AcademicGradeRecord>(response);
        }

        const resolvedGradeId = resolveId(grade);
        if (!resolvedGradeId) {
          throw new Error('Could not prepare the grade for this CAPS topic.');
        }

        let subject = findMatchingSubject(subjects, context);
        const code = academicSubjectCode(context);

        if (!subject) {
          const response = await apiClient.post('/academic/subjects', {
            schoolId,
            name: context.subjectName,
            code,
            gradeIds: [resolvedGradeId],
          });
          subject = unwrapResponse<AcademicSubjectRecord>(response);
        } else {
          const linkedGradeIds = subjectGradeIds(subject);
          if (linkedGradeIds.length === 0 || !linkedGradeIds.includes(resolvedGradeId)) {
            const response = await apiClient.put(`/academic/subjects/${resolveId(subject)}`, {
              schoolId,
              name: subject.name,
              code: subject.code || code,
              gradeIds: [...new Set([...linkedGradeIds, resolvedGradeId])],
            });
            subject = unwrapResponse<AcademicSubjectRecord>(response);
          }
        }

        const resolvedSubjectId = resolveId(subject);
        if (!resolvedSubjectId) {
          throw new Error('Could not prepare the subject for this CAPS topic.');
        }

        if (cancelled) return;
        setGradeId(resolvedGradeId);
        setSubjectId(resolvedSubjectId);
        setTerm(context.term);
        setContextStatus('ready');
        void Promise.all([refetchGrades(), refetchSubjects()]).catch(() => undefined);
      } catch (err: unknown) {
        if (cancelled) return;
        preparedContextKeyRef.current = null;
        setGradeId('');
        setSubjectId('');
        setContextStatus('error');
        setContextError(extractErrorMessage(
          err,
          'Could not prepare this CAPS topic for generation. Please try again.',
        ));
      }
    }

    void prepareAcademicContext();

    return () => {
      cancelled = true;
    };
  }, [
    selectedPrimaryNode,
    curriculumContext,
    user?.schoolId,
    subjects,
    grades,
    subjectsLoading,
    gradesLoading,
    refetchGrades,
    refetchSubjects,
  ]);

  const handleAssignClick = useCallback((resource: ContentResourceItem) => {
    setAssignResource(resource);
    setAssignOpen(true);
  }, []);

  const handleAssignSubmit = useCallback(
    async (formData: AssignHomeworkFormValues) => {
      if (!assignResource) return;
      const resourceSubjectId = typeof assignResource.subjectId === 'string'
        ? assignResource.subjectId
        : assignResource.subjectId.id;
      const success = await assignHomework({
        resourceId: assignResource.id,
        resourceTitle: assignResource.title,
        subjectId: resourceSubjectId,
        formData,
      });
      if (success) {
        setAssignOpen(false);
        setAssignResource(null);
      }
    },
    [assignHomework, assignResource],
  );

  const handleGenerate = useCallback(async () => {
    if (!selectedOutput || !selectedPrimaryNode || !canGenerate) return;

    setGenerating(true);
    setResult(null);

    try {
      if (selectedOutput === 'resource' || selectedOutput === 'homework') {
        const payload: GenerateContentPayload = {
          curriculumNodeId: selectedPrimaryNode.id,
          type: resourceType,
          gradeId,
          subjectId,
          term,
          blockTypes: BLOCK_TYPES_BY_RESOURCE[resourceType],
          difficulty,
          instructions: instructions.trim() || undefined,
        };
        const resource = await generateContent(payload);
        if (resource) {
          setResult({ kind: 'resource', resource });
          setStep(4);
          if (selectedOutput === 'homework') {
            setAssignResource(resource);
            setAssignOpen(true);
          }
        }
        return;
      }

      if (selectedOutput === 'paper') {
        const generated = await generatePaperWithAI({
          subjectId,
          gradeId,
          topicIds: selectedTopicIds,
          term,
          year: paperYear,
          paperType,
          duration: paperDuration,
          totalMarks: paperMarks,
          difficulty: paperDifficulty,
          title: computedPaperTitle,
          sectionConfig: buildPaperSections(paperMarks),
          instructions: instructions.trim() || undefined,
        });
        if (generated?.paperId) {
          setResult({ kind: 'paper', id: generated.paperId, title: computedPaperTitle });
          setStep(4);
        }
        return;
      }

      if (selectedOutput === 'questions') {
        const cognitiveLevel: CognitiveLevelPair = {
          caps: questionCapsLevel,
          blooms: questionBloomsLevel,
        };
        const response = await apiClient.post('/question-bank/questions/generate', {
          curriculumNodeId: selectedPrimaryNode.id,
          subjectId,
          gradeId,
          type: questionType,
          count: questionCount,
          difficulty,
          cognitiveLevel,
          gradeLevel: curriculumContext?.gradeLevel,
        });
        const questions = unwrapResponse<QuestionItem[]>(response);
        const count = Array.isArray(questions) ? questions.length : 0;
        setResult({ kind: 'questions', count });
        toast.success(`Generated ${count} question${count === 1 ? '' : 's'}`);
        setStep(4);
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'AI generation failed'));
    } finally {
      setGenerating(false);
    }
  }, [
    selectedOutput,
    selectedPrimaryNode,
    canGenerate,
    resourceType,
    gradeId,
    subjectId,
    term,
    difficulty,
    instructions,
    generateContent,
    selectedTopicIds,
    paperYear,
    paperType,
    paperDuration,
    paperMarks,
    paperDifficulty,
    computedPaperTitle,
    generatePaperWithAI,
    questionCapsLevel,
    questionBloomsLevel,
    questionType,
    questionCount,
    curriculumContext?.gradeLevel,
  ]);

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="Complete setup before using Quick Make."
      />
    );
  }

  if (frameworksLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick Make"
        description="Generate a single material without creating a Lesson. For richer lesson management, use the Lesson Workspace →"
      >
        {step > 1 && (
          <Button variant="outline" onClick={resetFlow}>
            Start Over
          </Button>
        )}
      </PageHeader>

      <UnifiedStepIndicator currentStep={step} />

      <div className="mx-auto max-w-5xl space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <Card className="flex flex-col items-start justify-between gap-3 border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-medium">Looking for the new Lesson Workspace?</h3>
                <p className="text-sm text-muted-foreground">Plan a complete lesson with all materials in one place.</p>
              </div>
              <Link href="/teacher/lessons">
                <Button>Open Workspace</Button>
              </Link>
            </Card>
            <div>
              <h2 className="text-xl font-semibold">What are you preparing?</h2>
              <p className="text-sm text-muted-foreground">
                Pick the teaching task first. Every option uses the same curriculum picker and guided setup.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {OUTPUTS.map((output) => {
                const Icon = output.icon;
                return (
                  <button
                    key={output.kind}
                    type="button"
                    onClick={() => {
                      if (output.kind === 'lesson_plan') {
                        router.push('/teacher/lessons/new');
                        return;
                      }
                      chooseOutput(output.kind);
                    }}
                    className="group h-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-muted/40">
                      <CardContent className="flex h-full flex-col gap-4 p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold">{output.title}</h3>
                              {output.badge && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                  {output.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{output.description}</p>
                          </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">{output.destination}</span>
                          <span className="inline-flex items-center gap-1 font-medium text-primary">
                            Continue <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && selectedOutput && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="outline">{selectedOutputMeta?.title}</Badge>
                <h2 className="mt-2 text-xl font-semibold">
                  Choose curriculum {allowMultipleTopics ? 'topics' : 'topic'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {allowMultipleTopics
                    ? 'A paper can cover multiple topics, as long as they are in the same subject, grade, and term.'
                    : `Search or browse ${selectedFrameworkMeta?.name ?? 'CAPS'} and choose the topic this should be based on.`}
                </p>
              </div>
              <ContextStatusBadge status={contextStatus} error={contextError} />
            </div>

            {selectedNodes.length > 0 && (
              <Card>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Selected curriculum coverage</p>
                    <Badge variant="secondary">
                      {selectedNodes.length} topic{selectedNodes.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNodes.map((node) => (
                      <span
                        key={node.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs"
                      >
                        <span className="truncate">{node.title}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const next = selectedNodes.filter((item) => item.id !== node.id);
                            setSelectedNodes(next);
                            setContextFromNodes(next);
                          }}
                        >
                          Remove
                        </button>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="space-y-4">
                <Tabs defaultValue="browse">
                  <TabsList>
                    <TabsTrigger value="browse">Browse</TabsTrigger>
                    <TabsTrigger value="search">Search</TabsTrigger>
                  </TabsList>
                  <TabsContent value="browse" className="mt-3">
                    <div className="max-h-[64vh] min-h-128 overflow-y-auto rounded-md border p-1">
                      <CurriculumTreeBrowser
                        frameworkId={selectedFramework}
                        selectedNodeId={selectedNodeId}
                        selectedNodeIds={selectedNodes.map((node) => node.id)}
                        onSelect={handleTopicSelect}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="search" className="mt-3">
                    <NodePicker
                      frameworkId={selectedFramework}
                      value={selectedNodeId}
                      onChange={(_nodeId, node) => {
                        if (node) handleTopicSelect(node);
                      }}
                      onSearch={searchNodes}
                      onLoadNode={loadNode}
                      placeholder="Search for a topic, subtopic, or assessment standard..."
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canContinueFromCurriculum}>
                Details
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && selectedOutput && (
          <div className="space-y-6">
            <div>
              <Badge variant="outline">{selectedOutputMeta?.title}</Badge>
              <h2 className="mt-2 text-xl font-semibold">Add the details</h2>
              <p className="text-sm text-muted-foreground">
                Subject, grade, term, and topic come from the curriculum, so only the task-specific choices are left.
              </p>
            </div>

            <Card>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="mt-1 text-sm font-medium">{curriculumContext?.subjectName ?? 'Prepared'}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Grade</p>
                  <p className="mt-1 text-sm font-medium">{curriculumContext?.gradeName ?? 'Prepared'}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Term</p>
                  <p className="mt-1 text-sm font-medium">Term {term}</p>
                </div>
              </CardContent>
            </Card>

            {(selectedOutput === 'resource' || selectedOutput === 'homework') && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {RESOURCE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setResourceType(type.value)}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-colors',
                        resourceType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted',
                      )}
                    >
                      <p className="text-sm font-semibold">{type.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedOutput === 'paper' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paper Type</Label>
                  <Select value={paperType} onValueChange={(value: unknown) => setPaperType(value as PaperType)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAPER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={paperTitle}
                    onChange={(event) => setPaperTitle(event.target.value)}
                    placeholder={computedPaperTitle}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Marks</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={paperMarks}
                    onChange={(event) => setPaperMarks(Number(event.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={paperDuration}
                    onChange={(event) => setPaperDuration(Number(event.target.value) || 60)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={paperDifficulty} onValueChange={(value: unknown) => setPaperDifficulty(value as PaperDifficulty)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAPER_DIFFICULTIES.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    value={paperYear}
                    onChange={(event) => setPaperYear(Number(event.target.value) || new Date().getFullYear())}
                  />
                </div>
              </div>
            )}

            {selectedOutput === 'questions' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select value={questionType} onValueChange={(value: unknown) => setQuestionType(value as QuestionType)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={questionCount}
                    onChange={(event) => setQuestionCount(Number(event.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CAPS Cognitive Level</Label>
                  <Select value={questionCapsLevel} onValueChange={(value: unknown) => setQuestionCapsLevel(value as CapsLevel)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAPS_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bloom Level</Label>
                  <Select value={questionBloomsLevel} onValueChange={(value: unknown) => setQuestionBloomsLevel(value as BloomsLevel)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BLOOMS_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedOutput !== 'paper' && (
              <div className="space-y-3">
                <Label>Difficulty</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DIFFICULTIES.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setDifficulty(level.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        difficulty === level.value ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                      )}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="Add any teacher instruction, e.g. more exam-style questions, South African examples, simpler language."
                className="min-h-24"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={!canGenerate}>
                Review and Generate
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && !result && selectedOutput && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedOutputMeta?.title}</Badge>
                <Badge variant="secondary">{selectedTopicIds.length} topic{selectedTopicIds.length === 1 ? '' : 's'}</Badge>
              </div>
              <CardTitle>Ready to generate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="mt-1 text-sm font-medium">{curriculumContext?.subjectName}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Grade</p>
                  <p className="mt-1 text-sm font-medium">{curriculumContext?.gradeName}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Term</p>
                  <p className="mt-1 text-sm font-medium">Term {term}</p>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">Curriculum coverage</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedNodes.map((node) => (
                    <Badge key={node.id} variant="outline" className="max-w-full truncate">
                      {node.title}
                    </Badge>
                  ))}
                </div>
              </div>

              {user?.isStandaloneTeacher && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Delivery mode: Print/PDF first</p>
                  <p className="mt-1 text-muted-foreground">
                    This works without learners on Campusly. You can print, save as PDF, or add learners later for online assignments.
                  </p>
                </div>
              )}

              {selectedOutput === 'paper' && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{computedPaperTitle}</p>
                  <p className="text-muted-foreground">
                    {paperTypeLabel(paperType)} - {paperMarks} marks - {paperDuration} minutes - {paperDifficulty}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => void handleGenerate()} disabled={!canGenerate} size="lg">
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {generating ? 'Generating...' : `Generate ${selectedOutputMeta?.title ?? 'with AI'}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && result?.kind === 'resource' && (
          <PreviewStep
            resource={result.resource}
            grades={grades}
            subjects={subjects}
            onPublish={submitForReview}
            onReview={reviewResource}
            canApprove={canApproveResources}
            showPublishActions={!user?.isStandaloneTeacher}
            assignLabel={selectedOutput === 'homework' ? 'Assign Homework' : 'Assign as Homework'}
            onRefine={refineResource}
            onRegenerate={() => {
              setResult(null);
              setStep(4);
            }}
            onReset={resetFlow}
            onResourceUpdated={(resource) => setResult({ kind: 'resource', resource })}
            onUpdateResource={updateResource as (id: string, data: UpdateResourcePayload) => Promise<ContentResourceItem | null>}
            onAssign={handleAssignClick}
          />
        )}

        {step === 4 && result && result.kind !== 'resource' && (
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {result.kind === 'paper' && <FileText className="h-6 w-6" />}
                {result.kind === 'questions' && <FileQuestion className="h-6 w-6" />}
              </div>
              <div>
                <Badge variant="outline">
                  {result.kind === 'paper' && 'Saved to Test Papers'}
                  {result.kind === 'questions' && 'Saved to Practice Questions'}
                </Badge>
                <h2 className="mt-3 text-xl font-semibold">
                  {result.kind === 'questions'
                    ? `${result.count} question${result.count === 1 ? '' : 's'} generated`
                    : result.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saved and ready for your next teaching step.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.kind === 'paper' && (
                  <Button onClick={() => router.push(`/teacher/papers/${result.id}`)}>
                    Open Paper and Memo
                  </Button>
                )}
                {result.kind === 'questions' && (
                  <Button onClick={() => router.push('/teacher/curriculum/questions')}>
                    Open Practice Questions
                  </Button>
                )}
                <Button variant="outline" onClick={resetFlow}>
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {assignResource && (
        <AssignHomeworkDialog
          open={assignOpen}
          onOpenChange={(open) => {
            setAssignOpen(open);
            if (!open) setAssignResource(null);
          }}
          resourceTitle={assignResource.title}
          resourceType={assignResource.type}
          classes={classes}
          onSubmit={handleAssignSubmit}
        />
      )}
    </div>
  );
}
