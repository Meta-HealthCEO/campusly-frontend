'use client';

import { useCallback } from 'react';
import { useReportComments } from '@/hooks/useReportComments';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useSubjects } from '@/hooks/useAcademics';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportCommentGenerator } from '@/components/ai-tutor/ReportCommentGenerator';

export default function ReportCommentsPage() {
  const {
    comments,
    generating,
    generateComments,
    loadComments,
    updateComment,
    updateCommentLocal,
    regenerateComment,
    deleteComment,
  } = useReportComments();
  const { classes, students } = useTeacherClasses();
  const { subjects } = useSubjects();

  const handleRegenerate = useCallback(
    (id: string, wasEdited: boolean) => {
      if (wasEdited) {
        const ok = window.confirm(
          'This will replace your edits with a new AI-generated comment. Continue?',
        );
        if (!ok) return;
      }
      void regenerateComment(id);
    },
    [regenerateComment],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const ok = window.confirm('Delete this report comment? This cannot be undone.');
      if (!ok) return;
      void deleteComment(id);
    },
    [deleteComment],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Comment Generator"
        description="Use AI to generate personalised report comments for your students"
      />
      <ReportCommentGenerator
        onGenerate={generateComments}
        onLoadComments={loadComments}
        onUpdateComment={updateComment}
        onUpdateCommentLocal={updateCommentLocal}
        onRegenerate={handleRegenerate}
        onDelete={handleDelete}
        comments={comments}
        generating={generating}
        classes={classes}
        subjects={subjects}
        students={students}
      />
    </div>
  );
}
