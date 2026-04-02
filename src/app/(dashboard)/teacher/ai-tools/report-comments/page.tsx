'use client';

import { useReportComments } from '@/hooks/useReportComments';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useSubjects } from '@/hooks/useAcademics';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportCommentGenerator } from '@/components/ai-tutor/ReportCommentGenerator';

export default function ReportCommentsPage() {
  const { comments, generating, generateComments, updateComment } = useReportComments();
  const { classes, students } = useTeacherClasses();
  const { subjects } = useSubjects();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Comment Generator"
        description="Use AI to generate personalised report comments for your students"
      />
      <ReportCommentGenerator
        onGenerate={generateComments}
        comments={comments}
        generating={generating}
        onUpdateComment={updateComment}
        classes={classes}
        subjects={subjects}
        students={students}
      />
    </div>
  );
}
