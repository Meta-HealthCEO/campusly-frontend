'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { useAITools } from '@/hooks/useAITools';
import { PaperPreview } from '@/components/ai-tools/PaperPreview';
import type { GeneratedPaper, PaperSection } from '@/components/ai-tools/types';

export default function PaperDetailPage() {
  const params = useParams();
  const paperId = params.id as string;
  const { loadPaperById, savePaper, regenerateQuestion, downloadPaperPdf, downloadMemoPdf } = useAITools();
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [editedKeys, setEditedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const result = await loadPaperById(paperId);
      if (result) setPaper(result);
      setLoading(false);
    }
    load();
  }, [paperId, loadPaperById]);

  const handleEditQuestion = useCallback((sectionIndex: number, questionIndex: number, text: string) => {
    if (!paper) return;
    const key = `${sectionIndex}:${questionIndex}`;
    setEditedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
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
  }, [paper]);

  const handleRegenerateQuestion = useCallback(async (sectionIndex: number, questionIndex: number) => {
    if (!paper) return;
    const key = `${sectionIndex}:${questionIndex}`;
    setRegeneratingKey(key);
    const updated = await regenerateQuestion(paper.id, sectionIndex, questionIndex);
    if (updated) {
      setPaper(updated);
      setEditedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    setRegeneratingKey(null);
  }, [paper, regenerateQuestion]);

  const handleSave = useCallback(async (sections: PaperSection[]) => {
    if (!paper) return;
    setSaving(true);
    const updated = await savePaper(paper.id, { sections });
    if (updated) setPaper(updated);
    setSaving(false);
  }, [paper, savePaper]);

  const handleDownloadPaper = useCallback(() => {
    if (!paper) return;
    void downloadPaperPdf(paper.id, `${paper.subject}-G${paper.grade}-T${paper.term}-paper.pdf`);
  }, [paper, downloadPaperPdf]);

  const handleDownloadMemo = useCallback(() => {
    if (!paper) return;
    void downloadMemoPdf(paper.id, `${paper.subject}-G${paper.grade}-T${paper.term}-memo.pdf`);
  }, [paper, downloadMemoPdf]);

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
          <Link href={ROUTES.TEACHER_AI_PAPERS}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
            </Button>
          </Link>
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${paper.subject} - Grade ${paper.grade}`} description={`${paper.topic} | Term ${paper.term}`}>
        <Link href={ROUTES.TEACHER_AI_PAPERS}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
          </Button>
        </Link>
      </PageHeader>

      <PaperPreview
        paper={paper}
        regeneratingKey={regeneratingKey}
        saving={saving}
        editedKeys={editedKeys}
        onEditQuestion={handleEditQuestion}
        onRegenerateQuestion={handleRegenerateQuestion}
        onSave={handleSave}
        onDownloadPaper={handleDownloadPaper}
        onDownloadMemo={handleDownloadMemo}
      />
    </div>
  );
}
