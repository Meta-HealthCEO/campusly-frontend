'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { FileQuestion, Sparkles, Upload, Search, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  QuestionCard, QuestionFormDialog, GenerateQuestionsDialog, UploadPaperDialog,
} from '@/components/questions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodePicker } from '@/components/curriculum';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useSubjects, useGrades } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { QUESTION_TYPES, CAPS_LEVELS } from '@/components/questions/question-constants';
import { extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  QuestionItem,
  QuestionType,
  CapsLevel,
  QuestionStatus,
  QBQuestionFilters,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from '@/types/question-bank';
import type { CurriculumNodeItem } from '@/types/curriculum-structure';

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All Difficulties' },
  { value: '1', label: 'Difficulty 1' },
  { value: '2', label: 'Difficulty 2' },
  { value: '3', label: 'Difficulty 3' },
  { value: '4', label: 'Difficulty 4' },
  { value: '5', label: 'Difficulty 5' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function TeacherQuestionsPage() {
  const { user } = useAuthStore();
  const {
    questions, questionsTotal, questionsLoading,
    fetchQuestions, getQuestion, createQuestion, updateQuestion,
    generateQuestions, extractFromPaper,
  } = useQuestionBank();
  const { subjects } = useSubjects();
  const { grades } = useGrades();
  const { frameworks, selectedFramework, searchNodes, loadNode } = useCurriculumStructure();

  // ─── Filter state ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [capsFilter, setCapsFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeTitle, setSelectedNodeTitle] = useState<string | null>(null);
  const [selectedNodeCode, setSelectedNodeCode] = useState<string | null>(null);

  // ─── Dialog state ──────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // ─── Build filters object ──────────────────────────────────────────────
  const filters = useMemo((): QBQuestionFilters => {
    const f: QBQuestionFilters = {};
    if (search.trim()) f.search = search.trim();
    if (typeFilter !== 'all') f.type = typeFilter as QuestionType;
    if (capsFilter !== 'all') f.capsLevel = capsFilter as CapsLevel;
    if (diffFilter !== 'all') f.difficulty = Number(diffFilter);
    if (statusFilter !== 'all') f.status = statusFilter as QuestionStatus;
    if (mineOnly) f.mine = true;
    if (selectedNodeId) f.curriculumNodeId = selectedNodeId;
    return f;
  }, [search, typeFilter, capsFilter, diffFilter, statusFilter, mineOnly, selectedNodeId]);

  useEffect(() => {
    setFetchError(false);
    fetchQuestions(filters).catch(() => setFetchError(true));
  }, [filters, fetchQuestions]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleCardClick = useCallback(async (question: QuestionItem) => {
    const full = await getQuestion(question.id);
    if (full) {
      setEditingQuestion(full);
      setEditOpen(true);
    }
  }, [getQuestion]);

  const handleUpdate = useCallback(async (id: string, payload: UpdateQuestionPayload) => {
    try {
      await updateQuestion(id, payload);
      await fetchQuestions(filters);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update question'));
    }
  }, [updateQuestion, fetchQuestions, filters]);

  const handleNodeChange = useCallback(
    (nodeId: string | null, node: CurriculumNodeItem | null) => {
      setSelectedNodeId(nodeId);
      setSelectedNodeTitle(node?.title ?? null);
      setSelectedNodeCode(node?.code ?? null);
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    fetchQuestions(filters).catch(() => setFetchError(true));
  }, [fetchQuestions, filters]);

  /** Batch-save extracted questions from paper upload */
  const handleSaveExtracted = useCallback(async (payloads: CreateQuestionPayload[]) => {
    for (const payload of payloads) {
      await createQuestion(payload);
    }
  }, [createQuestion]);

  // ─── Map subjects/grades for dialogs ────────────────────────────────────
  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ id: s.id, name: s.name })),
    [subjects],
  );
  const gradeOptions = useMemo(
    () => grades.map((g) => ({ id: g.id, name: g.name })),
    [grades],
  );

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="You need to be part of a school to use this feature. Contact your administrator or complete onboarding."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="AI-generated and uploaded questions for building assessment papers"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => setGenerateOpen(true)}>
            <Sparkles className="mr-2 size-4" />
            Generate with AI
          </Button>
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 size-4" />
            Upload Paper
          </Button>
        </div>
      </PageHeader>

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v: unknown) => setTypeFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {QUESTION_TYPES.map((qt) => (
              <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={capsFilter} onValueChange={(v: unknown) => setCapsFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="CAPS Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CAPS Levels</SelectItem>
            {CAPS_LEVELS.map((cl) => (
              <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={diffFilter} onValueChange={(v: unknown) => setDiffFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTY_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={mineOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMineOnly((prev) => !prev)}
        >
          Mine
        </Button>
      </div>

      {/* ─── Curriculum Node Picker ───────────────────────────────────────── */}
      {frameworks.length > 0 && (
        <div className="w-full sm:max-w-sm">
          <NodePicker
            frameworkId={selectedFramework}
            value={selectedNodeId}
            onChange={handleNodeChange}
            onSearch={searchNodes}
            onLoadNode={loadNode}
            placeholder="Filter by curriculum node..."
            disabled={!selectedFramework}
          />
        </div>
      )}

      {/* ─── Count badge ──────────────────────────────────────────────── */}
      {!questionsLoading && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{questionsTotal} question{questionsTotal !== 1 ? 's' : ''}</Badge>
        </div>
      )}

      {/* ─── Content ──────────────────────────────────────────────────── */}
      {questionsLoading ? (
        <LoadingSpinner />
      ) : fetchError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load questions"
          description="Something went wrong. Please try refreshing the page."
        />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No questions found"
          description="Generate questions with AI or upload a paper to get started."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setGenerateOpen(true)}>
                <Sparkles className="mr-2 size-4" />
                Generate with AI
              </Button>
              <Button variant="outline" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 size-4" />
                Upload Paper
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((q: QuestionItem) => (
            <QuestionCard key={q.id} question={q} onClick={handleCardClick} />
          ))}
        </div>
      )}

      {/* ─── Edit Dialog (existing questions only) ────────────────────── */}
      <QuestionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmitCreate={async () => {}}
        onSubmitUpdate={handleUpdate}
        editingQuestion={editingQuestion}
        subjects={subjectOptions}
        grades={gradeOptions}
        selectedNodeId={selectedNodeId ?? undefined}
        selectedNodeTitle={selectedNodeTitle ?? undefined}
        selectedNodeCode={selectedNodeCode ?? undefined}
        onGenerateQuestion={generateQuestions}
      />

      {/* ─── Generate Questions Dialog ────────────────────────────────── */}
      <GenerateQuestionsDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        subjects={subjectOptions}
        grades={gradeOptions}
        frameworkId={selectedFramework}
        onSearch={searchNodes}
        onLoadNode={loadNode}
        onGenerate={generateQuestions}
        onComplete={handleRefresh}
      />

      {/* ─── Upload Paper Dialog ──────────────────────────────── */}
      <UploadPaperDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        subjects={subjectOptions}
        grades={gradeOptions}
        frameworkId={selectedFramework}
        onSearch={searchNodes}
        onLoadNode={loadNode}
        onExtract={extractFromPaper}
        onSaveQuestions={handleSaveExtracted}
        onComplete={handleRefresh}
      />
    </div>
  );
}
