'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus } from 'lucide-react';
import { DisciplineTable } from '@/components/attendance/DisciplineTable';
import { DisciplineForm } from '@/components/attendance/DisciplineForm';
import { useTeacherDiscipline } from '@/hooks/useTeacherDiscipline';

export default function TeacherDisciplinePage() {
  const [open, setOpen] = useState(false);
  const { records, students, loading, createRecord } = useTeacherDiscipline();

  const handleSubmit = async (data: {
    studentId: string;
    type: string;
    severity: string;
    description: string;
    actionTaken?: string;
    outcome?: string;
    parentNotified?: boolean;
  }) => {
    const success = await createRecord(data);
    if (success) setOpen(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discipline Records"
        description="Track and manage student discipline incidents"
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Incident
        </Button>
      </PageHeader>

      <DisciplineTable
        records={records}
        canDelete={false}
      />

      <DisciplineForm
        open={open}
        onOpenChange={setOpen}
        students={students}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
