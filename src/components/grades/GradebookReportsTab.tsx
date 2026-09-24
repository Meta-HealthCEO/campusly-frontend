'use client';

import { useCallback } from 'react';
import { ModuleOffState } from '@/components/shared/ModuleOffState';
import { ReportCardPanel } from '@/components/reports/ReportCardPanel';
import { ReportCommentGenerator } from '@/components/ai-tutor/ReportCommentGenerator';
import { useModule } from '@/hooks/useModule';
import { useReportComments } from '@/hooks/useReportComments';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useSubjects } from '@/hooks/useAcademics';

interface Props {
  classId: string;
  term: string;
}

function ReportComments() {
  const comments = useReportComments();
  const { classes, students } = useTeacherClasses();
  const { subjects } = useSubjects();
  const { regenerateComment, deleteComment } = comments;

  const handleRegenerate = useCallback((id: string, wasEdited: boolean) => {
    if (wasEdited && !window.confirm('This will replace your edits with a new AI-generated comment. Continue?')) return;
    void regenerateComment(id);
  }, [regenerateComment]);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this report comment? This cannot be undone.')) return;
    void deleteComment(id);
  }, [deleteComment]);

  return (
    <ReportCommentGenerator
      onGenerate={comments.generateComments}
      onLoadComments={comments.loadComments}
      onUpdateComment={comments.updateComment}
      onUpdateCommentLocal={comments.updateCommentLocal}
      onRegenerate={handleRegenerate}
      onDelete={handleDelete}
      comments={comments.comments}
      generating={comments.generating}
      classes={classes}
      subjects={subjects}
      students={students}
    />
  );
}

/** Report cards for the gradebook's class, and AI report comments (when the school has AI tools). */
export function GradebookReportsTab({ classId, term }: Props) {
  const { isModuleEnabled } = useModule();
  return (
    <div className="space-y-8">
      <section aria-labelledby="report-card-heading" className="space-y-3">
        <h2 id="report-card-heading" className="font-heading text-lg font-semibold tracking-tight">Report card</h2>
        <ReportCardPanel classId={classId} term={term} />
      </section>
      <section aria-labelledby="report-comments-heading" className="space-y-3 print:hidden">
        <h2 id="report-comments-heading" className="font-heading text-lg font-semibold tracking-tight">Report comments</h2>
        {isModuleEnabled('ai_tools') ? <ReportComments /> : <ModuleOffState label="AI report comments" />}
      </section>
    </div>
  );
}
