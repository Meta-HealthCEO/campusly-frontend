'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, ShieldCheck, Lock, Download, FileText, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { PaperSection, QuestionSearchPanel, CompliancePanel } from '@/components/questions';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { extractErrorMessage } from '@/lib/api-helpers';
import type {
  AssessmentPaperItem,
  QuestionItem,
  CapsComplianceReport,
  PaperSectionItem,
  QuestionFilters as QBQuestionFilters,
} from '@/types/question-bank';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSubjectName(subjectId: AssessmentPaperItem['subjectId']): string {
  return typeof subjectId === 'string' ? subjectId : subjectId.name;
}

function getGradeName(gradeId: AssessmentPaperItem['gradeId']): string {
  return typeof gradeId === 'string' ? gradeId : gradeId.name;
}

const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  finalised: 'default',
  archived: 'outline',
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PaperBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.paperId as string;

  const {
    getPaper, updatePaper, addQuestionToPaper, removeQuestionFromPaper,
    finalisePaper, getCompliance, clonePaper,
    downloadPaperPdf, downloadMemoPdf,
    fetchQuestions, questions, questionsLoading,
  } = useQuestionBank();

  const [paper, setPaper] = useState<AssessmentPaperItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<CapsComplianceReport | null>(null);
  const [activeSearchSection, setActiveSearchSection] = useState<number | null>(null);
  const [confirmFinalise, setConfirmFinalise] = useState(false);

  const loadPaper = useCallback(async () => {
    const result = await getPaper(paperId);
    setPaper(result);
    setLoading(false);
  }, [paperId, getPaper]);

  useEffect(() => { loadPaper(); }, [loadPaper]);
  const populatedQuestions = useMemo(() => {
    const map = new Map<string, QuestionItem>();
    if (!paper) return map;
    for (const section of paper.sections) {
      for (const pq of section.questions) {
        // questionId may be populated as an object with id field from backend
        const qObj = pq.questionId as unknown;
        if (typeof qObj === 'object' && qObj !== null && 'id' in (qObj as Record<string, unknown>)) {
          const q = qObj as QuestionItem;
          map.set(q.id, q);
        }
      }
    }
    return map;
  }, [paper]);

  const excludeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!paper) return ids;
    for (const section of paper.sections) {
      for (const pq of section.questions) {
        const qObj = pq.questionId as unknown;
        if (typeof qObj === 'object' && qObj !== null && 'id' in (qObj as Record<string, unknown>)) {
          ids.add((qObj as { id: string }).id);
        } else if (typeof pq.questionId === 'string') {
          ids.add(pq.questionId);
        }
      }
    }
    return ids;
  }, [paper]);

  const isDraft = paper?.status === 'draft';

  const handleAddSection = useCallback(async () => {
    if (!paper) return;
    const newSection: PaperSectionItem = {
      title: `Section ${paper.sections.length + 1}`,
      instructions: '',
      order: paper.sections.length,
      questions: [],
    };
    try {
      await updatePaper(paper.id, { sections: [...paper.sections, newSection] });
      await loadPaper();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add section'));
    }
  }, [paper, updatePaper, loadPaper]);

  const handleUpdateSection = useCallback(
    async (sectionIndex: number, updates: { title?: string; instructions?: string }) => {
      if (!paper) return;
      const updated = paper.sections.map((s: PaperSectionItem, i: number) =>
        i === sectionIndex ? { ...s, ...updates } : s,
      );
      try {
        await updatePaper(paper.id, { sections: updated });
        await loadPaper();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to update section'));
      }
    },
    [paper, updatePaper, loadPaper],
  );

  const handleRemoveSection = useCallback(
    async (sectionIndex: number) => {
      if (!paper) return;
      const updated = paper.sections.filter((_: PaperSectionItem, i: number) => i !== sectionIndex);
      try {
        await updatePaper(paper.id, { sections: updated });
        await loadPaper();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to remove section'));
      }
    },
    [paper, updatePaper, loadPaper],
  );

  const handleAddQuestion = useCallback((q: QuestionItem) => {
    if (activeSearchSection === null || !paper) return;
    const section = paper.sections[activeSearchSection];
    const nextNumber = `${activeSearchSection + 1}.${section.questions.length + 1}`;
    addQuestionToPaper(paperId, {
      sectionIndex: activeSearchSection,
      questionId: q.id,
      questionNumber: nextNumber,
      marks: q.marks,
    })
      .then(() => loadPaper())
      .catch((err: unknown) => toast.error(extractErrorMessage(err, 'Failed to add question')));
  }, [activeSearchSection, paper, paperId, addQuestionToPaper, loadPaper]);

  const handleRemoveQuestion = useCallback(
    (sectionIndex: number, questionOrder: number) => {
      removeQuestionFromPaper(paperId, sectionIndex, questionOrder)
        .then(() => loadPaper())
        .catch((err: unknown) => toast.error(extractErrorMessage(err, 'Failed to remove question')));
    },
    [paperId, removeQuestionFromPaper, loadPaper],
  );

  const handleCheckCompliance = useCallback(async () => {
    const report = await getCompliance(paperId);
    setCompliance(report);
  }, [paperId, getCompliance]);

  const handleFinalise = useCallback(async () => {
    try {
      await finalisePaper(paperId);
      setConfirmFinalise(false);
      await loadPaper();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to finalise paper'));
    }
  }, [paperId, finalisePaper, loadPaper]);

  const handleClone = useCallback(async () => {
    try {
      const cloned = await clonePaper(paperId);
      router.push(`/teacher/curriculum/assessments/${cloned.id}`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to clone paper'));
    }
  }, [paperId, clonePaper, router]);

  const handleSearchQuestions = useCallback(
    (filters: QBQuestionFilters) => {
      if (!paper) return;
      const subjectId = typeof paper.subjectId === 'string' ? paper.subjectId : paper.subjectId.id;
      const gradeId = typeof paper.gradeId === 'string' ? paper.gradeId : paper.gradeId.id;
      void fetchQuestions({ ...filters, subjectId, gradeId } as Parameters<typeof fetchQuestions>[0]);
    },
    [paper, fetchQuestions],
  );

  if (loading) return <LoadingSpinner />;
  if (!paper) {
    return (
      <EmptyState
        icon={FileText}
        title="Paper not found"
        description="This assessment paper could not be loaded."
        action={
          <Button variant="outline" onClick={() => router.push('/teacher/curriculum/assessments')}>
            <ArrowLeft className="mr-2 size-4" /> Back to Assessments
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/curriculum/assessments')}>
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader title={paper.title}>
          <Badge variant={STATUS_VARIANT[paper.status] ?? 'secondary'}>
            {paper.status.charAt(0).toUpperCase() + paper.status.slice(1)}
          </Badge>
        </PageHeader>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{getSubjectName(paper.subjectId)}</Badge>
        <Badge variant="outline">{getGradeName(paper.gradeId)}</Badge>
        <Badge variant="outline">Term {paper.term}</Badge>
        <Badge variant="secondary">{paper.totalMarks} marks</Badge>
        <Badge variant="secondary">{paper.duration} min</Badge>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        {isDraft && (
          <>
            <Button size="sm" variant="outline" onClick={handleAddSection}>
              <Plus className="mr-1 size-3.5" /> Add Section
            </Button>
            <Button size="sm" variant="outline" onClick={handleCheckCompliance}>
              <ShieldCheck className="mr-1 size-3.5" /> Check Compliance
            </Button>
            <Button size="sm" onClick={() => setConfirmFinalise(true)}>
              <Lock className="mr-1 size-3.5" /> Finalise
            </Button>
          </>
        )}
        {paper.status === 'finalised' && (
          <>
            <Button size="sm" variant="outline" onClick={() => downloadPaperPdf(paperId)}>
              <Download className="mr-1 size-3.5" /> Download PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadMemoPdf(paperId)}>
              <Download className="mr-1 size-3.5" /> Download Memo
            </Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={handleClone}>
          <Copy className="mr-1 size-3.5" /> Clone
        </Button>
      </div>

      {/* Sections */}
      {paper.sections.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No sections yet"
          description="Add a section to start building this paper."
          action={
            isDraft ? (
              <Button onClick={handleAddSection}>
                <Plus className="mr-2 size-4" /> Add Section
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {paper.sections.map((section: PaperSectionItem, idx: number) => (
            <div key={idx} className="space-y-2">
              <PaperSection
                section={section}
                sectionIndex={idx}
                populatedQuestions={populatedQuestions}
                onAddQuestion={setActiveSearchSection}
                onRemoveQuestion={handleRemoveQuestion}
                onUpdateSection={handleUpdateSection}
                onRemoveSection={handleRemoveSection}
              />
              {activeSearchSection === idx && (
                <QuestionSearchPanel
                  questions={questions}
                  loading={questionsLoading}
                  onSearch={handleSearchQuestions}
                  onAdd={handleAddQuestion}
                  excludeQuestionIds={excludeIds}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Compliance panel */}
      {compliance && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-3">CAPS Compliance</h3>
          <CompliancePanel compliance={compliance} totalMarks={paper.totalMarks} />
        </div>
      )}

      {/* Finalise confirmation dialog */}
      <Dialog open={confirmFinalise} onOpenChange={setConfirmFinalise}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalise Paper</DialogTitle>
            <DialogDescription>
              Once finalised, this paper cannot be edited. You can still clone it to
              create a new draft. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmFinalise(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalise}>Finalise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
