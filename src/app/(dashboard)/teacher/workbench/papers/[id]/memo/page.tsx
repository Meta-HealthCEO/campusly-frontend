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
import { printContent } from '@/lib/print-utils';
import { generateMemoHtml } from '@/lib/paper-pdf';
import type { MemoSection as MemoSectionType, MemoStatus, PaperMemo } from '@/types';

interface QuestionRef {
  questionNumber: number;
  questionText: string;
}

interface PaperMemoEditorProps {
  memo: PaperMemo;
  paperId: string;
  saving: boolean;
  generateMemo: (paperId: string) => Promise<PaperMemo | null>;
  updateMemo: (id: string, data: Partial<PaperMemo>) => Promise<PaperMemo | null>;
}

export default function PaperMemoPage() {
  const params = useParams();
  const paperId = typeof params.id === 'string' ? params.id : '';

  const { memo, loading, generating, saving, fetchMemo, generateMemo, updateMemo } =
    usePaperMemo();

  useEffect(() => {
    if (paperId) void fetchMemo(paperId);
  }, [paperId, fetchMemo]);

  if (loading) return <LoadingSpinner />;

  if (!memo) {
    return (
      <div className="space-y-6">
        <PageHeader title="Paper Memo" description="Manage marking guidelines for this paper" />
        <EmptyState
          icon={FileText}
          title="No memo yet"
          description="Generate a memo from this paper to get started."
          action={
            <Button onClick={() => void generateMemo(paperId)} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1.5" />
              )}
              {generating ? 'Generating...' : 'Generate Memo'}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <PaperMemoEditor
      key={memo.id}
      memo={memo}
      paperId={paperId}
      saving={saving}
      generateMemo={generateMemo}
      updateMemo={updateMemo}
    />
  );
}

function PaperMemoEditor({
  memo,
  paperId,
  saving,
  generateMemo,
  updateMemo,
}: PaperMemoEditorProps) {
  const [localSections, setLocalSections] = useState<MemoSectionType[]>(memo.sections);
  const [localStatus, setLocalStatus] = useState<MemoStatus>(memo.status);
  const [regeneratingQuestion, setRegeneratingQuestion] = useState<number | null>(null);

  const questions: QuestionRef[] = localSections.flatMap((section) =>
    section.answers.map((answer) => ({
      questionNumber: answer.questionNumber,
      questionText: `Question ${answer.questionNumber}`,
    })),
  );

  function handleSectionChange(index: number, updated: MemoSectionType) {
    setLocalSections((prev) => prev.map((section, i) => (i === index ? updated : section)));
  }

  async function handleRegenerateAnswer(questionNumber: number) {
    setRegeneratingQuestion(questionNumber);
    await generateMemo(paperId);
    setRegeneratingQuestion(null);
  }

  function toggleStatus() {
    setLocalStatus((prev) => (prev === 'draft' ? 'final' : 'draft'));
  }

  async function handleSave() {
    await updateMemo(memo.id, { sections: localSections, status: localStatus });
  }

  function handlePrint() {
    const liveMemo: PaperMemo = { ...memo, sections: localSections, status: localStatus };
    printContent({
      title: 'Marking Memo',
      metadata: [
        { label: 'Total Marks', value: String(memo.totalMarks) },
        { label: 'Status', value: localStatus },
      ],
      bodyHtml: generateMemoHtml(liveMemo),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Paper Memo" description="Manage marking guidelines for this paper">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1.5" />
          Print Memo
        </Button>
        <Button variant="outline" size="sm" onClick={toggleStatus}>
          <Badge
            variant={localStatus === 'final' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {localStatus === 'final' ? 'Final' : 'Draft'}
          </Badge>
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Save className="h-4 w-4 mr-1.5" />
          )}
          Save
        </Button>
      </PageHeader>

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
    </div>
  );
}
