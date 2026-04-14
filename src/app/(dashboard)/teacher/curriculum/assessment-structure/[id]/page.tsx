'use client';

import { use, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { AssessmentStructureBuilder } from '@/components/assessment-structure/AssessmentStructureBuilder';
import { TermMarksTable } from '@/components/assessment-structure/TermMarksTable';
import { MarkEntryDialog } from '@/components/assessment-structure/MarkEntryDialog';
import { LockValidationDialog } from '@/components/assessment-structure/LockValidationDialog';
import { CloneStructureDialog } from '@/components/assessment-structure/CloneStructureDialog';
import { StudentManager } from '@/components/assessment-structure/StudentManager';
import { useAssessmentStructureDetail } from '@/hooks/useAssessmentStructureDetail';
import { useTermMarks } from '@/hooks/useTermMarks';
import { useIsStandalone } from '@/hooks/useIsStandalone';
import { useTeacherStudents } from '@/hooks/useTeacherStudents';
import type { ClonePayload } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface MarkEntryState {
  lineItemId: string;
  categoryId: string;
  assessmentId: string;
  name: string;
  totalMarks: number;
}

export default function AssessmentStructureDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const isStandalone = useIsStandalone();

  const detail = useAssessmentStructureDetail(id);
  const { termMarks, loading: marksLoading, fetchTermMarks } = useTermMarks(
    detail.structure?.status !== 'draft' ? id : null,
  );
  const { students: allStudents, loading: studentsLoading } = useTeacherStudents();

  const [markEntry, setMarkEntry] = useState<MarkEntryState | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);

  const handleSaveMarks = useCallback(
    async (marks: Array<{ studentId: string; mark: number; total: number; percentage: number; isAbsent: boolean }>) => {
      if (!markEntry) return;
      await detail.saveMarks(markEntry.assessmentId, marks);
      await fetchTermMarks();
      detail.fetchStructure();
    },
    [markEntry, fetchTermMarks, detail],
  );

  const handleSaveAndClose = useCallback(
    async (marks: Array<{ studentId: string; mark: number; total: number; percentage: number; isAbsent: boolean }>) => {
      await handleSaveMarks(marks);
      if (markEntry) {
        await detail.updateLineItem(markEntry.categoryId, markEntry.lineItemId, { status: 'closed' });
      }
    },
    [handleSaveMarks, markEntry, detail],
  );

  const handleClone = useCallback(
    async (payload: ClonePayload) => {
      const cloned = await detail.cloneStructure(payload);
      if (cloned) router.push(`/teacher/curriculum/assessment-structure/${cloned.id}`);
    },
    [detail, router],
  );

  if (detail.loading) return <LoadingSpinner />;

  if (!detail.structure) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Structure not found"
        description="This assessment structure could not be loaded."
        action={<Button onClick={() => router.back()}>Go Back</Button>}
      />
    );
  }

  const { structure } = detail;

  // Map students for StudentManager props
  const studentList = allStudents.map((s) => ({
    id: s.id,
    firstName: s.firstName ?? '',
    lastName: s.lastName ?? '',
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Assessment Structure" description="Manage categories, assessments, and mark capturing">
        <Button variant="outline" size="sm" onClick={() => router.back()}>Back</Button>
      </PageHeader>

      <AssessmentStructureBuilder
        structure={structure}
        onAddCategory={detail.addCategory}
        onUpdateCategory={detail.updateCategory}
        onDeleteCategory={detail.deleteCategory}
        onAddLineItem={detail.addLineItem}
        onUpdateLineItem={detail.updateLineItem}
        onDeleteLineItem={detail.deleteLineItem}
        onActivate={detail.activate}
        onLock={detail.lock}
        onUnlock={detail.unlock}
        onSaveAsTemplate={detail.saveAsTemplate}
        onClone={() => setCloneOpen(true)}
        termMarksTab={
          marksLoading ? (
            <LoadingSpinner />
          ) : termMarks ? (
            <TermMarksTable
              data={termMarks}
              onEnterMarks={(lineItemId, categoryId, name, totalMarks) => {
                let assessmentId = '';
                for (const cat of structure.categories) {
                  if (cat.id === categoryId) {
                    const item = cat.lineItems.find((li) => li.id === lineItemId);
                    assessmentId = item?.assessmentId ?? '';
                    break;
                  }
                }
                if (assessmentId) {
                  setMarkEntry({ lineItemId, categoryId, assessmentId, name, totalMarks });
                }
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Activate the structure to see term marks.</p>
          )
        }
        studentsTab={
          isStandalone ? (
            <StudentManager
              studentIds={structure.studentIds}
              onAdd={detail.addStudents}
              onRemove={detail.removeStudent}
              allStudents={studentList}
              studentsLoading={studentsLoading}
            />
          ) : undefined
        }
      />

      {markEntry && termMarks && (
        <MarkEntryDialog
          open={!!markEntry}
          onClose={() => setMarkEntry(null)}
          lineItemName={markEntry.name}
          totalMarks={markEntry.totalMarks}
          students={termMarks.students}
          lineItemId={markEntry.lineItemId}
          onSaveMarks={handleSaveMarks}
          onSaveAndClose={handleSaveAndClose}
        />
      )}

      {detail.lockErrors && (
        <LockValidationDialog
          open={!!detail.lockErrors}
          onClose={() => detail.setLockErrors(null)}
          errors={detail.lockErrors}
        />
      )}

      <CloneStructureDialog
        open={cloneOpen}
        onClose={() => setCloneOpen(false)}
        onClone={handleClone}
        currentName={structure.name}
      />
    </div>
  );
}
