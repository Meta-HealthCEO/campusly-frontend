'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuestionBankBrowser } from '@/components/workbench/papers/QuestionBankBrowser';
import { PaperBuilderPanel } from '@/components/workbench/papers/PaperBuilderPanel';
import { PaperConfigPanel } from '@/components/workbench/papers/PaperConfigPanel';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { usePaperMemo } from '@/hooks/usePaperMemo';
import { usePaperModeration } from '@/hooks/usePaperModeration';
import { printContent } from '@/lib/print-utils';
import { generatePaperHtml } from '@/lib/paper-pdf';
import type { BankQuestion } from '@/types';
import type { PaperBuilderSection } from '@/components/workbench/papers/PaperBuilderPanel';
import type { PaperConfig } from '@/components/workbench/papers/PaperConfigPanel';

const DEFAULT_CONFIG: PaperConfig = {
  subject: '',
  grade: '',
  term: '',
  duration: 60,
  totalMarks: 0,
};

function calcTotalMarks(sections: PaperBuilderSection[]): number {
  return sections.reduce(
    (sum, s) => sum + s.questions.reduce((acc, q) => acc + q.marks, 0),
    0,
  );
}

function newSection(index: number): PaperBuilderSection {
  return { id: crypto.randomUUID(), title: `Section ${index}`, questions: [] };
}

export default function PaperBuilderPage() {
  const router = useRouter();
  const { questions, loading, filters, setFilters } = useQuestionBank();
  const { generating, generateMemo } = usePaperMemo();
  const { submitting, submitForModeration } = usePaperModeration();

  const [sections, setSections] = useState<PaperBuilderSection[]>([]);
  const [config, setConfig] = useState<PaperConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('bank');

  const totalMarks = useMemo(() => calcTotalMarks(sections), [sections]);
  const derivedConfig = useMemo(
    () => ({ ...config, totalMarks }),
    [config, totalMarks],
  );

  const handleAddSection = useCallback(() => {
    setSections((prev) => [...prev, newSection(prev.length + 1)]);
  }, []);

  const handleRemoveSection = useCallback((sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  const handleUpdateSectionTitle = useCallback((sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s)),
    );
  }, []);

  const handleAddQuestion = useCallback(
    (question: BankQuestion) => {
      setSections((prev) => {
        if (prev.length === 0) {
          const section = newSection(1);
          return [{ ...section, questions: [question] }];
        }
        const last = prev[prev.length - 1];
        return [
          ...prev.slice(0, -1),
          { ...last, questions: [...last.questions, question] },
        ];
      });
      toast.success('Question added to paper');
    },
    [],
  );

  const handleRemoveQuestion = useCallback(
    (sectionId: string, questionIndex: number) => {
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                questions: s.questions.filter((_, i) => i !== questionIndex),
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleMoveQuestion = useCallback(
    (sectionId: string, fromIndex: number, toIndex: number) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          const qs = [...s.questions];
          if (toIndex < 0 || toIndex >= qs.length) return s;
          const [moved] = qs.splice(fromIndex, 1);
          qs.splice(toIndex, 0, moved);
          return { ...s, questions: qs };
        }),
      );
    },
    [],
  );

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      // Persist to localStorage as MVP draft storage
      const draft = { config: derivedConfig, sections };
      localStorage.setItem('paper_builder_draft', JSON.stringify(draft));
      toast.success('Draft saved');
    } catch (err: unknown) {
      console.error('Failed to save draft:', err);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [derivedConfig, sections]);

  const handleGenerateMemo = useCallback(async () => {
    // For draft papers not yet persisted to the server, use a local draft ID
    const draftId = `draft_${Date.now()}`;
    await generateMemo(draftId);
  }, [generateMemo]);

  const handleSubmitModeration = useCallback(async () => {
    // Save draft first to get a stable ID, then submit
    const draftId = `draft_${Date.now()}`;
    await submitForModeration(draftId);
  }, [submitForModeration]);

  const handleExportPdf = useCallback(() => {
    if (sections.length === 0) {
      toast.error('Add at least one question before exporting.');
      return;
    }
    const paperSections = sections.map((s) => ({
      title: s.title,
      questions: s.questions,
    }));
    const metadata = [
      ...(derivedConfig.subject ? [{ label: 'Subject', value: derivedConfig.subject }] : []),
      ...(derivedConfig.grade ? [{ label: 'Grade', value: derivedConfig.grade }] : []),
      ...(derivedConfig.term ? [{ label: 'Term', value: derivedConfig.term }] : []),
      { label: 'Duration', value: `${derivedConfig.duration} min` },
      { label: 'Total Marks', value: String(derivedConfig.totalMarks) },
    ];
    printContent({
      title: derivedConfig.subject ? `${derivedConfig.subject} Exam Paper` : 'Exam Paper',
      subtitle: derivedConfig.grade ? `Grade ${derivedConfig.grade}` : undefined,
      metadata,
      bodyHtml: generatePaperHtml(paperSections),
    });
  }, [sections, derivedConfig]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Paper Builder">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <Printer className="h-4 w-4 mr-1" />
          Export PDF
        </Button>
      </PageHeader>

      {/* Desktop: 3-column layout */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-3 border rounded-xl p-4 bg-card min-h-[70vh]">
          <QuestionBankBrowser
            questions={questions}
            loading={loading}
            onAddQuestion={handleAddQuestion}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        <div className="lg:col-span-6 border rounded-xl p-4 bg-card min-h-[70vh]">
          <PaperBuilderPanel
            sections={sections}
            onRemoveQuestion={handleRemoveQuestion}
            onMoveQuestion={handleMoveQuestion}
            onAddSection={handleAddSection}
            onRemoveSection={handleRemoveSection}
            onUpdateSectionTitle={handleUpdateSectionTitle}
          />
        </div>
        <div className="lg:col-span-3 border rounded-xl p-4 bg-card min-h-[70vh]">
          <PaperConfigPanel
            config={derivedConfig}
            onConfigChange={setConfig}
            sections={sections}
            onGenerateMemo={handleGenerateMemo}
            onSubmitModeration={handleSubmitModeration}
            onSaveDraft={handleSaveDraft}
            saving={saving}
            generatingMemo={generating}
          />
        </div>
      </div>

      {/* Mobile: Tab-based layout */}
      <div className="lg:hidden">
        <Tabs value={activeMobileTab} onValueChange={setActiveMobileTab}>
          <TabsList className="w-full flex">
            <TabsTrigger value="bank" className="flex-1">Bank</TabsTrigger>
            <TabsTrigger value="paper" className="flex-1">Paper</TabsTrigger>
            <TabsTrigger value="config" className="flex-1">Config</TabsTrigger>
          </TabsList>
          <TabsContent value="bank" className="mt-3 border rounded-xl p-4 bg-card min-h-[60vh]">
            <QuestionBankBrowser
              questions={questions}
              loading={loading}
              onAddQuestion={handleAddQuestion}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </TabsContent>
          <TabsContent value="paper" className="mt-3 border rounded-xl p-4 bg-card min-h-[60vh]">
            <PaperBuilderPanel
              sections={sections}
              onRemoveQuestion={handleRemoveQuestion}
              onMoveQuestion={handleMoveQuestion}
              onAddSection={handleAddSection}
              onRemoveSection={handleRemoveSection}
              onUpdateSectionTitle={handleUpdateSectionTitle}
            />
          </TabsContent>
          <TabsContent value="config" className="mt-3 border rounded-xl p-4 bg-card min-h-[60vh]">
            <PaperConfigPanel
              config={derivedConfig}
              onConfigChange={setConfig}
              sections={sections}
              onGenerateMemo={handleGenerateMemo}
              onSubmitModeration={handleSubmitModeration}
              onSaveDraft={handleSaveDraft}
              saving={saving}
              generatingMemo={generating}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
