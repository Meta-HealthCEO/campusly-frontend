'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Send, Users } from 'lucide-react';
import type { CourseTree, CourseStatus } from '@/types';
import type { UpdateCourseInput } from '@/hooks/useCourseBuilder';
import { AssignCourseDialog } from './AssignCourseDialog';

interface CourseBuilderMetaPanelProps {
  course: CourseTree;
  onUpdate: (data: UpdateCourseInput) => Promise<boolean>;
  onSubmitForReview: () => Promise<boolean>;
  isDirty: boolean;
}

const STATUS_LABEL: Record<CourseStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
  archived: 'Archived',
};

function statusVariant(status: CourseStatus): 'secondary' | 'default' | 'outline' {
  if (status === 'published') return 'default';
  if (status === 'in_review') return 'secondary';
  return 'outline';
}

export function CourseBuilderMetaPanel({
  course,
  onUpdate,
  onSubmitForReview,
  isDirty,
}: CourseBuilderMetaPanelProps) {
  const [assignOpen, setAssignOpen] = useState(false);
  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const canSubmit = course.status === 'draft' && totalLessons > 0;

  return (
    <div className="space-y-4">
      {/* Status card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Status</span>
            <Badge variant={statusVariant(course.status)}>
              {STATUS_LABEL[course.status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {course.status === 'draft' && course.reviewNotes && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Rejected with feedback
                </p>
                <p className="text-amber-700/80 dark:text-amber-400/80 mt-1">
                  {course.reviewNotes}
                </p>
              </div>
            </div>
          )}
          {isDirty && (
            <p className="text-xs text-muted-foreground italic">Saving...</p>
          )}
          {course.status === 'draft' && (
            <Button
              className="w-full"
              onClick={onSubmitForReview}
              disabled={!canSubmit}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit for Review
            </Button>
          )}
          {!canSubmit && course.status === 'draft' && totalLessons === 0 && (
            <p className="text-xs text-muted-foreground">
              Add at least one lesson before submitting.
            </p>
          )}
          {course.status === 'published' && (
            <>
              <Button
                className="w-full"
                variant="default"
                onClick={() => setAssignOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Assign to Class
              </Button>
              {course.publishedAt && (
                <p className="text-xs text-muted-foreground">
                  Published on {new Date(course.publishedAt).toLocaleDateString()}
                </p>
              )}
            </>
          )}
          {course.status === 'in_review' && (
            <p className="text-xs text-muted-foreground">
              Awaiting HOD review. You&apos;ll be notified when it&apos;s published.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metadata form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Course details</CardTitle>
        </CardHeader>
        <CardContent>
          <MetaFields
            course={course}
            onUpdate={onUpdate}
            readOnly={course.status === 'archived'}
          />
        </CardContent>
      </Card>

      <AssignCourseDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        courseId={course.id}
        courseTitle={course.title}
      />
    </div>
  );
}

function MetaFields({
  course,
  onUpdate,
  readOnly,
}: {
  course: CourseTree;
  onUpdate: (data: UpdateCourseInput) => Promise<boolean>;
  readOnly: boolean;
}) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [coverImageUrl, setCoverImageUrl] = useState(course.coverImageUrl);
  const [tags, setTags] = useState(course.tags.join(', '));

  useEffect(() => {
    setTitle(course.title);
    setDescription(course.description);
    setCoverImageUrl(course.coverImageUrl);
    setTags(course.tags.join(', '));
  }, [course.id, course.title, course.description, course.coverImageUrl, course.tags]);

  const saveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === course.title) {
      setTitle(course.title);
      return;
    }
    const ok = await onUpdate({ title: trimmed });
    if (!ok) setTitle(course.title);
  };

  const saveDescription = async () => {
    if (description === course.description) return;
    const ok = await onUpdate({ description });
    if (!ok) setDescription(course.description);
  };

  const saveCoverImage = async () => {
    if (coverImageUrl === course.coverImageUrl) return;
    const ok = await onUpdate({ coverImageUrl });
    if (!ok) setCoverImageUrl(course.coverImageUrl);
  };

  const saveTags = async () => {
    const parsed = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (JSON.stringify(parsed) === JSON.stringify(course.tags)) return;
    const ok = await onUpdate({ tags: parsed });
    if (!ok) setTags(course.tags.join(', '));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="course-title">Title</Label>
        <Input
          id="course-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          disabled={readOnly}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="course-description">Description</Label>
        <Textarea
          id="course-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          disabled={readOnly}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="course-cover">Cover image URL</Label>
        <Input
          id="course-cover"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          onBlur={saveCoverImage}
          placeholder="https://..."
          disabled={readOnly}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="course-tags">Tags</Label>
        <Input
          id="course-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onBlur={saveTags}
          placeholder="comma, separated"
          disabled={readOnly}
        />
      </div>
    </div>
  );
}
