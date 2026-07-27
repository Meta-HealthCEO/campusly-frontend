'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { FileQuestion, Upload, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  QuestionFormDialog, GenerateQuestionsDialog, UploadPaperDialog,
} from '@/components/questions';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NodePicker } from '@/components/curriculum';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useSubjects, useGrades } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { buildQuestionColumns } from './_questionColumns';
import { QuestionFilterBar } from './_QuestionFilterBar';
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
  const questionColumns = useMemo<ColumnDef<QuestionItem>[]>(
    () => buildQuestionColumns(setPendingDelete),
    [],
  );

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
      <QuestionFilterBar
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        capsFilter={capsFilter}
        setCapsFilter={setCapsFilter}
        diffFilter={diffFilter}
        setDiffFilter={setDiffFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        mineOnly={mineOnly}
        toggleMineOnly={() => setMineOnly((prev) => !prev)}
      />

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
