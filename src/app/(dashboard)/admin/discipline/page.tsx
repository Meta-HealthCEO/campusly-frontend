'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { DisciplineTable } from '@/components/attendance/DisciplineTable';
import { DisciplineForm } from '@/components/attendance/DisciplineForm';
import { useDiscipline } from '@/hooks/useDiscipline';

export default function AdminDisciplinePage() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const {
    records, students, loading,
    fetchRecords, initialize,
    createRecord, deleteRecord,
  } = useDiscipline();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading) {
      fetchRecords({ status: statusFilter, type: typeFilter });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const handleSubmit = async (data: {
    studentId: string;
    type: string;
    severity: string;
    description: string;
    actionTaken?: string;
    outcome?: string;
    parentNotified?: boolean;
  }) => {
    await createRecord(data);
    setOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discipline Management"
        description="Manage discipline incidents across the school"
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Incident
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val as string)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val === 'all' ? '' : val as string)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="misconduct">Misconduct</SelectItem>
            <SelectItem value="bullying">Bullying</SelectItem>
            <SelectItem value="vandalism">Vandalism</SelectItem>
            <SelectItem value="truancy">Truancy</SelectItem>
            <SelectItem value="dress_code">Dress Code</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DisciplineTable
        records={records}
        canDelete={true}
        onDelete={deleteRecord}
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
