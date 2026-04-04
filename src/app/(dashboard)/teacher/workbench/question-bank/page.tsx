'use client';

import { useState } from 'react';
import { Plus, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { QuestionCard } from '@/components/workbench/question-bank/QuestionCard';
import { QuestionFilters } from '@/components/workbench/question-bank/QuestionFilters';
import { QuestionForm } from '@/components/workbench/question-bank/QuestionForm';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import type { BankQuestion, QuestionFilters as QFilters } from '@/types';

export default function QuestionBankPage() {
  const {
    questions,
    questionsLoading: loading,
    questionsTotal: totalCount,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  } = useQuestionBank();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [filters, setFilters] = useState<any>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frameworks: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topics: any[] = [];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankQuestion | undefined>(undefined);

  function handleAdd() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function handleEdit(question: BankQuestion) {
    setEditing(question);
    setFormOpen(true);
  }

  async function handleSubmit(data: Record<string, unknown>) {
    if (editing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateQuestion(editing.id, data as any);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createQuestion(data as any);
    }
  }

  function handleDelete(id: string) {
    deleteQuestion(id);
  }

  function handleFiltersChange(updated: QFilters) {
    setFilters(updated);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="Manage and reuse questions across assessments"
      >
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </PageHeader>

      <QuestionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        subjects={subjects}
        frameworks={frameworks}
      />

      <p className="text-sm text-muted-foreground">
        {totalCount} {totalCount === 1 ? 'question' : 'questions'} found
      </p>

      {questions.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No questions yet"
          description="Add your first question to start building your question bank."
          action={
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q as unknown as BankQuestion}
              onEdit={handleEdit}
              onDelete={handleDelete}
              expanded={expandedId === q.id}
              onToggle={() => toggleExpand(q.id)}
            />
          ))}
        </div>
      )}

      <QuestionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editing}
        frameworks={frameworks}
        subjects={subjects}
        topics={topics}
      />
    </div>
  );
}
