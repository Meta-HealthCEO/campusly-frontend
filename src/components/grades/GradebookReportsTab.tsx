'use client';

import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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

type PendingAction = { kind: 'regenerate' | 'delete'; id: string } | null;

function ReportComments() {
  const comments = useReportComments();
  const { classes, students } = useTeacherClasses();
  const { subjects } = useSubjects();
  const { regenerateComment, deleteComment } = comments;
  const [pending, setPending] = useState<PendingAction>(null);

  const handleRegenerate = useCallback((id: string, wasEdited: boolean) => {
    if (wasEdited) setPending({ kind: 'regenerate', id });
    else void regenerateComment(id);
  }, [regenerateComment]);

  const handleDelete = useCallback((id: string) => setPending({ kind: 'delete', id }), []);

  const confirm = async (): Promise<void> => {
    if (!pending) return;
    if (pending.kind === 'regenerate') await regenerateComment(pending.id);
    else await deleteComment(pending.id);
    setPending(null);
  };

  return (
    <>
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
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        title={pending?.kind === 'delete' ? 'Delete this comment?' : 'Replace your edits?'}
        description={pending?.kind === 'delete'
          ? 'The report comment is deleted. This cannot be undone.'
          : 'A new AI comment replaces the one you edited.'}
        confirmLabel={pending?.kind === 'delete' ? 'Delete comment' : 'Write a new comment'}
        variant={pending?.kind === 'delete' ? 'destructive' : 'default'}
        onConfirm={confirm}
      />
    </>
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
