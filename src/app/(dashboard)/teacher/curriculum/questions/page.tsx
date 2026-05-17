'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { FileQuestion, Upload, Search, AlertTriangle, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  QuestionFormDialog, GenerateQuestionsDialog, UploadPaperDialog,
} from '@/components/questions';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
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
    questionsError,
    fetchQuestions, getQuestion, createQuestion, updateQuestion,
    deleteQuestion,
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
  // Default to 'approved' so the bank surface only shows committed questions.
  // AI-generated drafts (which now live INLINE on papers — no Question doc
  // until the teacher commits via Save-to-bank) wouldn't show here anyway,
  // but legacy draft rows from the old auto-approve flow are hidden too.
  const [statusFilter, setStatusFilter] = useState('approved');
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
    void fetchQuestions(filters).then((ok) => setFetchError(!ok));
  }, [filters, fetchQuestions]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleCardClick = useCallback(async (question: QuestionItem) => {
    const full = await getQuestion(question.id);
    if (full) {
      setEditingQuestion(full);
      setEditOpen(true);
    }
  }, [getQuestion]);

  const [pendingDelete, setPendingDelete] = useState<QuestionItem | null>(null);
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteQuestion(id);
      await fetchQuestions(filters);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete question'));
    }
  }, [deleteQuestion, fetchQuestions, filters]);

  // ─── Table columns ─────────────────────────────────────────────────────
  const questionColumns = useMemo<ColumnDef<QuestionItem>[]>(() => [
    {
      accessorKey: 'stem',
      header: 'Question',
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xl">{row.original.stem}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize text-xs">
          {row.original.type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'capsLevel',
      header: 'CAPS',
      accessorFn: (row) => row.cognitiveLevel?.caps ?? '',
      cell: ({ getValue }) => (
        <span className="text-xs capitalize">
          {String(getValue() ?? '').replace(/_/g, ' ')}
        </span>
      ),
    },
    { accessorKey: 'marks', header: 'Marks' },
    { accessorKey: 'difficulty', header: 'Diff.' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variant: 'default' | 'secondary' | 'outline' | 'destructive' =
          status === 'approved' ? 'default'
            : status === 'rejected' ? 'destructive'
              : status === 'pending_review' ? 'secondary' : 'outline';
        return (
          <Badge variant={variant} className="capitalize text-xs">
            {status.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground capitalize">
          {row.original.source.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'usageCount',
      header: 'Used',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.usageCount}×
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          aria-label="Delete question"
          onClick={(e) => {
            e.stopPropagation();
            setPendingDelete(row.original);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ], []);

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
    void fetchQuestions(filters).then((ok) => setFetchError(!ok));
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
        title="Saved Questions"
        description="Curated questions you've committed from past papers. Generate a new paper to add more, then bookmark the keepers."
      >
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 size-4" />
          Upload Paper
        </Button>
      </PageHeader>

      <p className="text-sm text-muted-foreground">
        Practice questions are usually generated inside a Lesson.{' '}
        <Link href="/teacher/lessons" className="underline">Open a lesson</Link> to add them.
      </p>

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
          description={questionsError ?? 'Something went wrong. Please try refreshing the page.'}
        />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No questions found"
          description="Upload a paper to extract questions, or open a lesson to generate questions with AI."
          action={
            <Button variant="outline" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 size-4" />
              Upload Paper
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={questionColumns}
          data={questions}
          searchKey="stem"
          searchPlaceholder="Search by question text..."
          onRowClick={(q) => void handleCardClick(q)}
        />
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

      {/* ─── Delete Confirm ──────────────────────────────────── */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open: boolean) => { if (!open) setPendingDelete(null); }}
        title="Delete this question?"
        description={pendingDelete
          ? `"${pendingDelete.stem.slice(0, 120)}${pendingDelete.stem.length > 120 ? '…' : ''}" will be soft-deleted from your bank. Existing papers that reference it keep working.`
          : ''}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (pendingDelete) await handleDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
