'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListSkeleton } from '@/components/shared/skeletons';
import { ReviewQueueItem } from '@/components/courses/ReviewQueueItem';
import { CoursePreviewDialog } from '@/components/courses/CoursePreviewDialog';
import { useCourseReviewQueue } from '@/hooks/useCourseReviewQueue';
import { CheckCircle2 } from 'lucide-react';

export default function CourseReviewQueuePage() {
  const { items, loading, fetchCoursePreview, publish, reject } =
    useCourseReviewQueue();
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Review Queue"
        description="Review courses submitted by teachers and publish or reject them with feedback."
      />

      {loading ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to review"
          description="Courses submitted for review will appear here. Check back later."
        />
      ) : (
        <div className="space-y-3">
          {items.map((course) => (
            <ReviewQueueItem
              key={course.id}
              course={course}
              onClick={() => setPreviewCourseId(course.id)}
            />
          ))}
        </div>
      )}

      <CoursePreviewDialog
        open={previewCourseId !== null}
        onOpenChange={(v) => { if (!v) setPreviewCourseId(null); }}
        courseId={previewCourseId}
        fetchPreview={fetchCoursePreview}
        onPublish={publish}
        onReject={reject}
      />
    </div>
  );
}
