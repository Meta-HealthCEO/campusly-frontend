'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { useAITools } from '@/hooks/useAITools';
import { PaperPreview } from '@/components/ai-tools/PaperPreview';
import type { GeneratedPaper, PaperSection } from '@/components/ai-tools/types';

export default function PaperDetailPage() {
  const params = useParams();
  const paperId = params.id as string;
  const { loadPaperById, savePaper, regenerateQuestion } = useAITools();
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await loadPaperById(paperId);
      if (result) setPaper(result);
      setLoading(false);
    }
    load();
  }, [paperId, loadPaperById]);

  const handleEditQuestion = useCallback(
    (sectionIndex: number, questionIndex: number, text: string) => {
      if (!paper) return;
      const newSections = paper.sections.map((sec, sIdx) => {
        if (sIdx !== sectionIndex) return sec;
        return {
          ...sec,
          questions: sec.questions.map((q, qIdx) =>
            qIdx === questionIndex ? { ...q, questionText: text } : q,
          ),
        };
      });
      setPaper({ ...paper, sections: newSections });
    },
    [paper],
  );

  const handleRegenerateQuestion = useCallback(
    async (sectionIndex: number, questionIndex: number) => {
      if (!paper) return;
      setRegeneratingKey(`${sectionIndex}:${questionIndex}`);
      const updated = await regenerateQuestion(paper.id, sectionIndex, questionIndex);
      if (updated) setPaper(updated);
      setRegeneratingKey(null);
    },
    [paper, regenerateQuestion],
  );

  const handleSave = useCallback(
    async (sections: PaperSection[]) => {
      if (!paper) return;
      setSaving(true);
      const updated = await savePaper(paper.id, { sections });
      if (updated) setPaper(updated);
      setSaving(false);
    },
    [paper, savePaper],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="space-y-6">
        <PageHeader title="Paper Not Found" description="The requested paper could not be loaded.">
          <Link href={ROUTES.TEACHER_CURRICULUM_PAPERS}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Papers
            </Button>
          </Link>
        </PageHeader>
        <EmptyState icon={FileText} title="Paper not found" description="This paper may have been deleted." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${paper.subject} — Grade ${paper.grade}`}
        description={`${paper.topic} | Term ${paper.term} | ${paper.totalMarks} marks | ${paper.duration} min`}
      >
        <Link href={ROUTES.TEACHER_CURRICULUM_PAPERS}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Papers
          </Button>
        </Link>
      </PageHeader>

      <PaperPreview
        paper={paper}
        regeneratingKey={regeneratingKey}
        saving={saving}
        onEditQuestion={handleEditQuestion}
        onRegenerateQuestion={handleRegenerateQuestion}
        onSave={handleSave}
      />
    </div>
  );
}
