'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CourseBuilderOutline } from './CourseBuilderOutline';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { CourseTree } from '@/types';

interface CoursePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string | null;
  fetchPreview: (id: string) => Promise<CourseTree | null>;
  onPublish: (id: string) => Promise<boolean>;
  onReject: (id: string, reviewNotes: string) => Promise<boolean>;
}

/**
 * Read-only preview of a submitted course with publish/reject actions.
 * Reuses CourseBuilderOutline in readOnly mode so HODs see exactly the
 * same structure teachers built, without edit affordances.
 */
export function CoursePreviewDialog({
  open,
  onOpenChange,
  courseId,
  fetchPreview,
  onPublish,
  onReject,
}: CoursePreviewDialogProps) {
  const [course, setCourse] = useState<CourseTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!open || !courseId) {
      setCourse(null);
      setRejecting(false);
      setReviewNotes('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const c = await fetchPreview(courseId);
      if (!cancelled) {
        setCourse(c);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, courseId, fetchPreview]);

  const handlePublish = async () => {
    if (!courseId) return;
    setActing(true);
    const ok = await onPublish(courseId);
    setActing(false);
    if (ok) onOpenChange(false);
  };

  const handleConfirmReject = async () => {
    if (!courseId || !reviewNotes.trim()) return;
    setActing(true);
    const ok = await onReject(courseId, reviewNotes.trim());
    setActing(false);
    if (ok) onOpenChange(false);
  };

  const totalLessons = course?.modules.reduce((n, m) => n + m.lessons.length, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{course?.title ?? 'Course Preview'}</DialogTitle>
          {course && (
            <DialogDescription>
              {totalLessons} lesson{totalLessons === 1 ? '' : 's'} across{' '}
              {course.modules.length} module{course.modules.length === 1 ? '' : 's'}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          {loading && <LoadingSpinner />}
          {!loading && course && (
            <>
              {course.description && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {course.description}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Course outline</h4>
                <CourseBuilderOutline
                  course={course}
                  selectedLessonId={null}
                  onSelectLesson={() => {}}
                  onAddModule={async () => {}}
                  onRenameModule={async () => {}}
                  onDeleteModule={async () => {}}
                  onReorderModules={async () => {}}
                  onAddLesson={() => {}}
                  onDeleteLesson={async () => {}}
                  onReorderLessons={async () => {}}
                  readOnly
                />
              </div>

              {rejecting && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    Reject with feedback
                  </div>
                  <Label htmlFor="review-notes" className="text-xs">
                    Explain what needs to change so the author can revise and resubmit.
                  </Label>
                  <Textarea
                    id="review-notes"
                    rows={4}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="e.g. The quiz in Week 2 has too few questions. Please add at least 5 multiple-choice questions covering section 2.3."
                    autoFocus
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {!rejecting ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejecting(true)}
                disabled={!course || acting}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject with notes
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                disabled={!course || acting}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {acting ? 'Publishing...' : 'Publish'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejecting(false)}
                disabled={acting}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={!reviewNotes.trim() || acting}
              >
                {acting ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
