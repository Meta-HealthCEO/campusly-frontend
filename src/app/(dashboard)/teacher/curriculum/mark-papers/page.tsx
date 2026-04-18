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
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherMarking } from '@/hooks/useTeacherMarking';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { MarkingPaperOption, MarkingQuestion } from '@/hooks/useTeacherMarking';

type Step = 1 | 2 | 3 | 4 | 5;
type View = 'wizard' | 'history';

const STEP_LABELS = ['Select Paper', 'Select Student', 'Upload Pages', 'AI Marking', 'Save'] as const;

export default function MarkPapersPage() {
  const { user } = useAuthStore();
  const {
    loading, papers, papersLoading, currentMarking, markings,
    fetchPapers, markPaper, getMarkings, getMarking, updateMarking, publishMarking,
  } = useTeacherMarking();
  const { students, loading: classesLoading } = useTeacherClasses();

  const [view, setView] = useState<View>('wizard');
  const [step, setStep] = useState<Step>(1);
  const [selectedPaper, setSelectedPaper] = useState<MarkingPaperOption | null>(null);
  const [studentData, setStudentData] = useState<{ studentId?: string; studentName: string } | null>(null);

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
  const handleUploadSubmit = useCallback(async (images: { base64: string; type: string }[]) => {
    if (!selectedPaper || !studentData) return;
    try {
      await markPaper({
        paperId: selectedPaper.id,
        studentName: studentData.studentName,
        studentId: studentData.studentId,
        images: images.map((i) => i.base64),
        imageTypes: images.map((i) => i.type),
      });
      setStep(4);
    } catch (err: unknown) {
      console.error('Marking failed', err);
    }
  }, [selectedPaper, studentData, markPaper]);

  // Step 4 — update marks
  const handleUpdateMarks = useCallback(async (questions: MarkingQuestion[]) => {
    if (!currentMarking) return;
    await updateMarking(currentMarking.id, questions);
  }, [currentMarking, updateMarking]);

  // Publish current marking
  const handlePublish = useCallback(async () => {
    if (!currentMarking) return;
    await publishMarking(currentMarking.id);
    toast.success('Published to gradebook');
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
    setView('history');
  }, [selectedPaper, getMarkings]);

  // View a specific marking from history
  const handleViewMarking = useCallback(async (id: string) => {
    await getMarking(id);
    setStep(4);
    setView('wizard');
  }, [getMarking]);

  // Publish from history table
  const handlePublishFromHistory = useCallback(async (id: string) => {
    await publishMarking(id);
    if (selectedPaper) {
      await getMarkings(selectedPaper.id);
    }
  }, [publishMarking, selectedPaper, getMarkings]);

  // Back from history to wizard
  const handleBackFromHistory = useCallback(() => {
    setView('wizard');
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

      {view === 'wizard' && (
        <>
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
        </>
      )}

      {view === 'history' && (
        <MarkingHistoryTable
          markings={markings}
          onViewMarking={(id) => void handleViewMarking(id)}
          onPublish={handlePublishFromHistory}
          onBack={handleBackFromHistory}
        />
      )}
    </div>
  );
}
