'use client';

import { use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader, LoadingSpinner, EmptyState } from '@/components/shared';
import { FileText, Download, AlertTriangle, RotateCw, ArrowLeft } from 'lucide-react';
import { LessonNotesView } from '@/components/classroom/LessonNotesView';
import { useLessonNotes } from '@/hooks/useLessonNotes';
import { useAuthStore } from '@/stores/useAuthStore';
import { printContent } from '@/lib/print-utils';

export default function LessonNotesPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { note, loading, error, retry } = useLessonNotes(sessionId);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTimestampClick = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }, []);

  const handleExportPDF = useCallback(() => {
    if (!note) return;
    const { notes } = note;
    const bodyHtml = `
      <section>
        <h2>Summary</h2>
        <p>${notes.summary}</p>
      </section>
      ${notes.keyConcepts.length ? `
        <section>
          <h2>Key Concepts</h2>
          <ul>${notes.keyConcepts.map((c) => `<li>${c}</li>`).join('')}</ul>
        </section>
      ` : ''}
      ${notes.actionItems.length ? `
        <section>
          <h2>Action Items</h2>
          <ul>${notes.actionItems.map((a) => `<li>&#9744; ${a}</li>`).join('')}</ul>
        </section>
      ` : ''}
      ${notes.teacherQuestions.length ? `
        <section>
          <h2>Questions &amp; Answers</h2>
          ${notes.teacherQuestions.map((q) => `<div><strong>Q:</strong> ${q.question}<br/><strong>A:</strong> ${q.answer}</div>`).join('')}
        </section>
      ` : ''}
      ${notes.keyTerms.length ? `
        <section>
          <h2>Key Terms</h2>
          <dl>${notes.keyTerms.map((t) => `<dt><strong>${t.term}</strong></dt><dd>${t.definition}</dd>`).join('')}</dl>
        </section>
      ` : ''}
    `;
    printContent({
      title: 'Lesson Notes',
      subtitle: new Date(note.createdAt).toLocaleDateString(),
      bodyHtml,
    });
  }, [note]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <EmptyState
          icon={FileText}
          title="No lesson notes"
          description={error ?? 'This session has no recorded notes yet.'}
        />
      </div>
    );
  }

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {note.status === 'completed' && (
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        )}
      </div>

      <PageHeader
        title="Lesson Notes"
        description={`Recorded ${new Date(note.createdAt).toLocaleDateString()}`}
      />

      {note.status === 'processing' && (
        <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-2">
          <LoadingSpinner />
          <p className="text-sm font-medium">Generating lesson notes...</p>
          <p className="text-xs text-muted-foreground">
            The AI is transcribing the recording and creating study notes. This may take a few minutes.
          </p>
        </div>
      )}

      {note.status === 'failed' && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Notes generation failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                {note.errorMessage ?? 'An error occurred while generating the lesson notes.'}
              </p>
            </div>
          </div>
          {isTeacher && (
            <Button variant="outline" size="sm" onClick={retry} className="gap-1">
              <RotateCw className="h-4 w-4" /> Retry
            </Button>
          )}
        </div>
      )}

      {note.status === 'completed' && (
        <>
          {note.recordingUrl && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <video
                ref={videoRef}
                src={note.recordingUrl}
                controls
                className="w-full max-h-[60vh] bg-black"
              />
            </div>
          )}
          <LessonNotesView note={note} onTimestampClick={handleTimestampClick} />
        </>
      )}
    </div>
  );
}
