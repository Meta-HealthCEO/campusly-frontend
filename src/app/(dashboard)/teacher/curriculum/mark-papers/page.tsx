'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MarkingPaperSelect } from '@/components/ai-tools/MarkingPaperSelect';
import { MarkingStudentSelect } from '@/components/ai-tools/MarkingStudentSelect';
import { MarkingUpload } from '@/components/ai-tools/MarkingUpload';
import { MarkingResults } from '@/components/ai-tools/MarkingResults';
import { MarkingHistoryTable } from '@/components/ai-tools/MarkingHistoryTable';
import { MarkingBulkUpload } from '@/components/ai-tools/MarkingBulkUpload';
import { BulkBatchFlow } from '@/components/ai-tools/BulkBatchFlow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherMarking } from '@/hooks/useTeacherMarking';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { MarkingPaperOption, MarkingQuestion } from '@/hooks/useTeacherMarking';

type Step = 1 | 2 | 3 | 4 | 5;
type Tab = 'single' | 'class' | 'history';

const STEP_LABELS = ['Select Paper', 'Select Student', 'Upload Pages', 'AI Marking', 'Save'] as const;

export default function MarkPapersPage() {
  const { user } = useAuthStore();
  const {
    loading, papers, papersLoading, papersError, currentMarking, markings,
    fetchPapers, markPaper, getMarkings, getMarking, updateMarking, publishMarking,
  } = useTeacherMarking();
  const { students, loading: classesLoading } = useTeacherClasses();

  const [tab, setTab] = useState<Tab>('single');
  const [step, setStep] = useState<Step>(1);
  const [selectedPaper, setSelectedPaper] = useState<MarkingPaperOption | null>(null);
  const [studentData, setStudentData] = useState<{ studentId?: string; studentName: string } | null>(null);
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  // Step 1 handler
  const handlePaperSelect = useCallback((paper: MarkingPaperOption) => {
    setSelectedPaper(paper);
    setStep(2);
  }, []);

  // Step 2 handler
  const handleStudentSelect = useCallback((data: { studentId?: string; studentName: string }) => {
    setStudentData(data);
    setStep(3);
  }, []);

  // Step 3 handler — submit images for marking
  // TODO: Task 14 will replace this base64->File bridge with native File[] flow.
  const handleUploadSubmit = useCallback(async (images: { base64: string; type: string }[]) => {
    if (!selectedPaper || !studentData) return;
    try {
      const files = images.map((img, idx) => {
        // base64 may be a data URL (data:image/png;base64,XXX) or just the payload.
        const payload = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
        const binary = atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const ext = img.type.split('/')[1] ?? 'png';
        return new File([bytes], `page-${idx + 1}.${ext}`, { type: img.type });
      });
      const result = await markPaper(
        selectedPaper.id,
        selectedPaper.type,
        studentData.studentName,
        files,
        { studentId: studentData.studentId },
      );
      if (result) setStep(4);
    } catch (err: unknown) {
      console.error('Marking failed', err);
    }
  }, [selectedPaper, studentData, markPaper]);

  // Step 4 — update marks
  const handleUpdateMarks = useCallback(async (questions: MarkingQuestion[]) => {
    if (!currentMarking) return;
    await updateMarking(currentMarking.id, questions);
  }, [currentMarking, updateMarking]);

  // Publish current marking — called by MarkingResults dialog
  const handlePublish = useCallback(async (assessmentId: string, comment?: string) => {
    if (!currentMarking) return;
    await publishMarking(currentMarking.id, assessmentId, currentMarking.studentId, comment);
  }, [currentMarking, publishMarking]);

  // Mark next student — loop back to step 2, keep paper
  const handleMarkNext = useCallback(() => {
    setStudentData(null);
    setStep(2);
  }, []);

  // View all results
  const handleViewAll = useCallback(async () => {
    if (selectedPaper) {
      await getMarkings(selectedPaper.id);
    }
    setTab('history');
  }, [selectedPaper, getMarkings]);

  // View a specific marking from history
  const handleViewMarking = useCallback(async (id: string) => {
    await getMarking(id);
    setStep(4);
    setTab('single');
  }, [getMarking]);

  // Publish from history table — called by MarkingHistoryTable dialog
  const handlePublishFromHistory = useCallback(async (
    id: string,
    assessmentId: string,
    comment?: string,
  ) => {
    const marking = markings.find((m) => m.id === id);
    await publishMarking(id, assessmentId, marking?.studentId, comment);
    if (selectedPaper) {
      await getMarkings(selectedPaper.id);
    }
  }, [publishMarking, selectedPaper, getMarkings, markings]);

  // Back from history to single-student wizard
  const handleBackFromHistory = useCallback(() => {
    setTab('single');
  }, []);

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="You need to be part of a school to use this feature."
      />
    );
  }

  if (classesLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mark Papers (OCR)"
        description="Photograph handwritten answers and let AI grade them"
      >
        <Link href={ROUTES.TEACHER_CURRICULUM}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <Tabs value={tab} onValueChange={(v: unknown) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="single">Single Student</TabsTrigger>
          <TabsTrigger value="class">Whole Class</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          {/* Step indicators */}
          <div className="flex gap-2 flex-wrap">
            {STEP_LABELS.map((label, idx) => (
              <Badge
                key={label}
                variant={step === idx + 1 ? 'default' : 'outline'}
              >
                {idx + 1}. {label}
              </Badge>
            ))}
          </div>

          {step === 1 && (
            <MarkingPaperSelect
              papers={papers}
              loading={papersLoading}
              error={papersError}
              onRetry={() => { void fetchPapers(); }}
              onSelect={handlePaperSelect}
            />
          )}

          {step === 2 && (
            <MarkingStudentSelect
              students={students}
              onSelect={handleStudentSelect}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <MarkingUpload
              onSubmit={(images) => void handleUploadSubmit(images)}
              onBack={() => setStep(2)}
              isLoading={loading}
            />
          )}

          {step === 4 && currentMarking && (
            <MarkingResults
              marking={currentMarking}
              onUpdateMarks={handleUpdateMarks}
              onPublish={handlePublish}
              onMarkNext={handleMarkNext}
              onViewAll={() => void handleViewAll()}
              isLoading={loading}
            />
          )}
        </TabsContent>

        <TabsContent value="class">
          {!bulkBatchId && <MarkingBulkUpload onCreated={setBulkBatchId} />}
          {bulkBatchId && (
            <BulkBatchFlow batchId={bulkBatchId} onDone={() => setBulkBatchId(null)} />
          )}
        </TabsContent>

        <TabsContent value="history">
          <MarkingHistoryTable
            markings={markings}
            onViewMarking={(id) => void handleViewMarking(id)}
            onPublish={handlePublishFromHistory}
            onBack={handleBackFromHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
