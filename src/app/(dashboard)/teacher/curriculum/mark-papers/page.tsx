'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MarkingPaperSelect } from '@/components/ai-tools/MarkingPaperSelect';
import { MarkingStudentSelect, type MarkingStudentSelectValue } from '@/components/ai-tools/MarkingStudentSelect';
import { MarkingUpload } from '@/components/ai-tools/MarkingUpload';
import { MarkingTextEntry, type DigitalAnswer } from '@/components/ai-tools/MarkingTextEntry';
import { MarkingResults } from '@/components/ai-tools/MarkingResults';
import { MarkingHistoryTable } from '@/components/ai-tools/MarkingHistoryTable';
import { MarkingBulkUpload } from '@/components/ai-tools/MarkingBulkUpload';
import { BulkBatchFlow } from '@/components/ai-tools/BulkBatchFlow';
import { SummaryRow, ModeButton } from './_wizard-bits';
import {
  ArrowLeft, AlertTriangle, Camera, Keyboard, History, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherMarking } from '@/hooks/useTeacherMarking';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import type { MarkingPaperOption, MarkingQuestion } from '@/hooks/useTeacherMarking';

type View = 'mark' | 'bulk' | 'history';
type AnswerMode = 'photo' | 'digital';

export default function MarkPapersPage() {
  const { user } = useAuthStore();
  const {
    loading, papers, papersLoading, papersError, currentMarking, markings,
    fetchPapers, markPaper, markPaperFromText, getMarkings, getMarking,
    updateMarking, publishMarking, setCurrentMarking,
  } = useTeacherMarking();
  const { students, loading: classesLoading } = useTeacherClasses();

  const [view, setView] = useState<View>('mark');
  const [selectedPaper, setSelectedPaper] = useState<MarkingPaperOption | null>(null);
  const [studentData, setStudentData] = useState<MarkingStudentSelectValue | null>(null);
  const [mode, setMode] = useState<AnswerMode | null>(null);
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  // Deep-link support: ?marking=<id> jumps straight into the review-only
  // view for that marking. Used from the Submissions tab on the paper-detail
  // page when a teacher clicks "Open marking" for a student's submission.
  const searchParams = useSearchParams();
  const markingQueryId = searchParams?.get('marking');
  useEffect(() => {
    if (!markingQueryId) return;
    void getMarking(markingQueryId);
    const timer = window.setTimeout(() => {
      setSelectedPaper(null);
      setStudentData(null);
      setMode(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [markingQueryId, getMarking]);

  // Eagerly refresh history when the view switches to it.
  useEffect(() => {
    if (view !== 'history') return;
    void getMarkings(selectedPaper?.id);
  }, [view, selectedPaper, getMarkings]);

  // ─── Mark wizard handlers ───────────────────────────────────────────────

  const resetWizard = useCallback(() => {
    setSelectedPaper(null);
    setStudentData(null);
    setMode(null);
    setCurrentMarking(null);
  }, [setCurrentMarking]);

  const handleUploadSubmit = useCallback(async (images: { base64: string; type: string }[]) => {
    if (!selectedPaper || !studentData) return;
    const files = images.map((img, idx) => {
      const payload = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const ext = img.type.split('/')[1] ?? 'png';
      return new File([bytes], `page-${idx + 1}.${ext}`, { type: img.type });
    });
    await markPaper(
      selectedPaper.id,
      selectedPaper.type,
      studentData.studentName,
      files,
      { studentId: studentData.studentId, classId: studentData.classId },
    );
  }, [selectedPaper, studentData, markPaper]);

  const handleDigitalSubmit = useCallback(async (answers: DigitalAnswer[]) => {
    if (!selectedPaper || !studentData) return;
    await markPaperFromText(
      selectedPaper.id,
      selectedPaper.type,
      studentData.studentName,
      answers,
      { studentId: studentData.studentId, classId: studentData.classId },
    );
  }, [selectedPaper, studentData, markPaperFromText]);

  const handleUpdateMarks = useCallback(async (questions: MarkingQuestion[]) => {
    if (!currentMarking) return;
    await updateMarking(currentMarking.id, questions);
  }, [currentMarking, updateMarking]);

  const handlePublish = useCallback(async (assessmentId: string, comment?: string) => {
    if (!currentMarking) return;
    await publishMarking(currentMarking.id, assessmentId, currentMarking.studentId, comment);
  }, [currentMarking, publishMarking]);

  // After saving / publishing one student, allow marking the next.
  const handleMarkNext = useCallback(() => {
    setStudentData(null);
    setMode(null);
    setCurrentMarking(null);
  }, [setCurrentMarking]);

  // ─── History handlers ───────────────────────────────────────────────────

  const handleViewMarking = useCallback(async (id: string) => {
    await getMarking(id);
    // Drop into the mark wizard at the review step. The marking record
    // carries paperId/studentId already, so we don't need to re-pick them.
    setSelectedPaper(null);
    setStudentData(null);
    setMode(null);
    setView('mark');
  }, [getMarking]);

  const handlePublishFromHistory = useCallback(async (
    id: string,
    assessmentId: string,
    comment?: string,
  ) => {
    const marking = markings.find((m) => m.id === id);
    await publishMarking(id, assessmentId, marking?.studentId, comment);
    await getMarkings(selectedPaper?.id);
  }, [publishMarking, selectedPaper, getMarkings, markings]);

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

  // ─── Sub-views ──────────────────────────────────────────────────────────

  if (view === 'history') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Marking History"
          description="Every paper you've marked. Re-open to review or publish."
        >
          <Button variant="outline" size="sm" onClick={() => setView('mark')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to marking
          </Button>
        </PageHeader>
        <MarkingHistoryTable
          markings={markings}
          onViewMarking={(id) => void handleViewMarking(id)}
          onPublish={handlePublishFromHistory}
          onBack={() => setView('mark')}
        />
      </div>
    );
  }

  if (view === 'bulk') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mark a Whole Class"
          description="Upload all student answer pages in one go. AI extracts each header, matches to a student, then marks every paper against the memo."
        >
          <Button variant="outline" size="sm" onClick={() => { setView('mark'); setBulkBatchId(null); }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </PageHeader>
        {!bulkBatchId && <MarkingBulkUpload onCreated={setBulkBatchId} />}
        {bulkBatchId && (
          <BulkBatchFlow batchId={bulkBatchId} onDone={() => setBulkBatchId(null)} />
        )}
      </div>
    );
  }

  // ─── Default: single-student mark wizard (progressive disclosure) ───────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mark Papers"
        description="Pick a paper, pick a student, then upload photos or paste typed answers. AI grades against the memo."
      >
        <Button variant="outline" size="sm" onClick={() => setView('bulk')}>
          <Users className="mr-2 h-4 w-4" /> Whole class
        </Button>
        <Button variant="outline" size="sm" onClick={() => setView('history')}>
          <History className="mr-2 h-4 w-4" /> History
        </Button>
        <Link href="/teacher/papers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
      </PageHeader>

      <div className="space-y-4 max-w-3xl">
        {/* Review-only mode — the user opened a marking from History. We show
             the MarkingResults on its own (no wizard chain) so the page stays
             focused on the record they came to look at. */}
        {currentMarking && !selectedPaper && (
          <>
            <Button variant="outline" size="sm" onClick={handleMarkNext}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Start a new marking
            </Button>
            <MarkingResults
              marking={currentMarking}
              onUpdateMarks={handleUpdateMarks}
              onPublish={handlePublish}
              onMarkNext={handleMarkNext}
              onViewAll={() => setView('history')}
              isLoading={loading}
            />
          </>
        )}

        {/* Wizard mode — user is starting a fresh marking. */}
        {!(currentMarking && !selectedPaper) && (
          <>
            {/* Step 1 — paper */}
            {!selectedPaper && (
              <MarkingPaperSelect
                papers={papers}
                loading={papersLoading}
                error={papersError}
                onRetry={() => { void fetchPapers(); }}
                onSelect={setSelectedPaper}
              />
            )}

            {selectedPaper && (
              <SummaryRow
                label="Paper"
                value={selectedPaper.title}
                onChange={resetWizard}
                changeLabel="Change paper"
              />
            )}

            {/* Step 2 — student */}
            {selectedPaper && !studentData && (
              <MarkingStudentSelect
                students={students}
                onSelect={setStudentData}
                onBack={resetWizard}
              />
            )}

            {selectedPaper && studentData && (
              <SummaryRow
                label="Student"
                value={studentData.studentName}
                onChange={() => { setStudentData(null); setMode(null); setCurrentMarking(null); }}
                changeLabel="Change student"
              />
            )}

            {/* Step 3 — answer mode */}
            {selectedPaper && studentData && !mode && !currentMarking && (
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  <h3 className="text-base font-semibold">How did the student answer?</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ModeButton
                      icon={Camera}
                      title="Photographed"
                      description="Upload photos of the handwritten pages. AI reads + grades."
                      onClick={() => setMode('photo')}
                    />
                    <ModeButton
                      icon={Keyboard}
                      title="Typed"
                      description="Paste or type the answers per question. AI grades against the memo."
                      onClick={() => setMode('digital')}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedPaper && studentData && mode && !currentMarking && (
              <SummaryRow
                label="Answer mode"
                value={mode === 'photo' ? 'Photographed' : 'Typed'}
                onChange={() => setMode(null)}
                changeLabel="Change mode"
              />
            )}

            {/* Step 4 — collect answers */}
            {selectedPaper && studentData && mode === 'photo' && !currentMarking && (
              <MarkingUpload
                onSubmit={(images) => void handleUploadSubmit(images)}
                onBack={() => setMode(null)}
                isLoading={loading}
              />
            )}

            {selectedPaper && studentData && mode === 'digital' && !currentMarking && (
              <MarkingTextEntry
                paperId={selectedPaper.id}
                onSubmit={(answers) => void handleDigitalSubmit(answers)}
                onBack={() => setMode(null)}
                isLoading={loading}
              />
            )}

            {/* Step 5 — review */}
            {selectedPaper && currentMarking && (
              <MarkingResults
                marking={currentMarking}
                onUpdateMarks={handleUpdateMarks}
                onPublish={handlePublish}
                onMarkNext={handleMarkNext}
                onViewAll={() => setView('history')}
                isLoading={loading}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
