'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { FileQuestion, Plus, Sparkles, Search, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { QuestionCard, QuestionFormDialog } from '@/components/questions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

  // ─── Dialog state ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

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
    fetchQuestions(filters);
  }, [filters, fetchQuestions]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleCardClick = useCallback(async (question: QuestionItem) => {
    const full = await getQuestion(question.id);
    if (full) {
      setEditingQuestion(full);
      setFormOpen(true);
    }
  }, [getQuestion]);

  const handleCreate = useCallback(async (payload: CreateQuestionPayload) => {
    try {
      await createQuestion(payload);
      await fetchQuestions(filters);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create question'));
    }
  }, [createQuestion, fetchQuestions, filters]);

  const handleUpdate = useCallback(async (id: string, payload: UpdateQuestionPayload) => {
    try {
      await updateQuestion(id, payload);
      await fetchQuestions(filters);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update question'));
    }
  }, [updateQuestion, fetchQuestions, filters]);

  const handleOpenCreate = useCallback(() => {
    setEditingQuestion(null);
    setFormOpen(true);
  }, []);

  const handleNodeChange = useCallback(
    (nodeId: string | null, node: CurriculumNodeItem | null) => {
      setSelectedNodeId(nodeId);
      setSelectedNodeTitle(node?.title ?? null);
    },
    [],
  );

  // ─── Map subjects/grades for dialog ────────────────────────────────────
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
      <PageHeader title="Question Bank" description="Browse, create, and manage questions">
        <Button variant="outline" disabled>
          <Sparkles className="mr-2 size-4" />
          Generate
          {/* TODO: wire up AI generate dialog in Phase 3b */}
        </Button>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 size-4" />
          Create Question
        </Button>
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
      ) : questions.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No questions found"
          description="Adjust your filters or create a new question to get started."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 size-4" />
              Create Question
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((q: QuestionItem) => (
            <QuestionCard key={q.id} question={q} onClick={handleCardClick} />
          ))}
        </div>
      )}

      {/* ─── Form Dialog ──────────────────────────────────────────────── */}
      <QuestionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmitCreate={handleCreate}
        onSubmitUpdate={handleUpdate}
        editingQuestion={editingQuestion}
        subjects={subjectOptions}
        grades={gradeOptions}
        selectedNodeId={selectedNodeId ?? undefined}
        selectedNodeTitle={selectedNodeTitle ?? undefined}
      />
    </div>
  );
}
