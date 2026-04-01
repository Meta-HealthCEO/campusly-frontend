'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Loader2, FileText, Wand2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MemoSection } from '@/components/workbench/papers/MemoSection';
import { usePaperMemo } from '@/hooks/usePaperMemo';
import type { MemoSection as MemoSectionType, MemoStatus } from '@/types';

// Minimal paper question reference: in production this would come from the
// paper hook — kept lean here to stay within 350 lines.
interface QuestionRef {
  questionNumber: number;
  questionText: string;
}

export default function PaperMemoPage() {
  const params = useParams();
  const paperId = typeof params.id === 'string' ? params.id : '';

  const { memo, loading, generating, saving, fetchMemo, generateMemo, updateMemo } =
    usePaperMemo();

  const [localSections, setLocalSections] = useState<MemoSectionType[]>([]);
  const [localStatus, setLocalStatus] = useState<MemoStatus>('draft');
  const [regeneratingQuestion, setRegeneratingQuestion] = useState<number | null>(null);

  useEffect(() => {
    if (paperId) fetchMemo(paperId);
  }, [paperId, fetchMemo]);

  useEffect(() => {
    if (memo) {
      setLocalSections(memo.sections);
      setLocalStatus(memo.status);
    }
  }, [memo]);

  // Placeholder question texts — a full implementation would fetch these from
  // the paper builder hook/API.
  const questions: QuestionRef[] = localSections.flatMap((section) =>
    section.answers.map((a) => ({
      questionNumber: a.questionNumber,
      questionText: `Question ${a.questionNumber}`,
    })),
  );

  function handleSectionChange(index: number, updated: MemoSectionType) {
    setLocalSections((prev) => prev.map((s, i) => (i === index ? updated : s)));
  }

  async function handleRegenerateAnswer(questionNumber: number) {
    setRegeneratingQuestion(questionNumber);
    // Re-generate the entire memo then refresh — backend doesn't expose single-
    // question regeneration, so we regenerate at memo level.
    await generateMemo(paperId);
    setRegeneratingQuestion(null);
  }

  function toggleStatus() {
    setLocalStatus((prev) => (prev === 'draft' ? 'final' : 'draft'));
  }

  async function handleSave() {
    if (!memo) return;
    await updateMemo(memo.id, { sections: localSections, status: localStatus });
  }

  async function handleGenerate() {
    await generateMemo(paperId);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Paper Memo" description="Manage marking guidelines for this paper">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1.5" />
          Print Memo
        </Button>
        {memo && (
          <Button variant="outline" size="sm" onClick={toggleStatus}>
            <Badge
              variant={localStatus === 'final' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {localStatus === 'final' ? 'Final' : 'Draft'}
            </Badge>
          </Button>
        )}
        {memo && (
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save
          </Button>
        )}
      </PageHeader>

      {!memo ? (
        <EmptyState
          icon={FileText}
          title="No memo yet"
          description="Generate a memo from this paper to get started."
          action={
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1.5" />
              )}
              {generating ? 'Generating...' : 'Generate Memo'}
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {localSections.map((section, i) => (
            <MemoSection
              key={i}
              section={section}
              questions={questions}
              onChange={(updated) => handleSectionChange(i, updated)}
              onRegenerateAnswer={handleRegenerateAnswer}
              regeneratingQuestion={regeneratingQuestion}
            />
          ))}
          {localSections.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No sections found"
              description="This memo has no sections yet."
            />
          )}
        </div>
      )}
    </div>
  );
}
