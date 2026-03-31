'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/lib/api-client';
import type { Student } from '@/types';
import { DisciplineTable } from '@/components/attendance/DisciplineTable';
import { DisciplineForm } from '@/components/attendance/DisciplineForm';

interface DisciplineRecord {
  _id: string;
  studentId: {
    _id: string;
    userId?: { firstName?: string; lastName?: string };
    admissionNumber?: string;
  } | string;
  reportedBy?: { firstName?: string; lastName?: string };
  type: string;
  severity: string;
  description: string;
  status: string;
  outcome?: string;
  parentNotified?: boolean;
  createdAt: string;
}

export default function AdminDisciplinePage() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const fetchRecords = async () => {
    try {
      const params: Record<string, string> = { schoolId: user?.schoolId ?? '' };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const res = await apiClient.get('/attendance/discipline', { params });
      const raw = res.data.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : raw.data ?? [];
      setRecords(arr);
    } catch {
      console.error('Failed to load discipline records');
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [, studentsRes] = await Promise.allSettled([
          fetchRecords(),
          apiClient.get('/students'),
        ]);
        if (studentsRes.status === 'fulfilled') {
          const d = studentsRes.value.data.data ?? studentsRes.value.data;
          const arr = Array.isArray(d) ? d : d.data ?? [];
          setStudents(arr.map((s: Record<string, unknown>) => ({
            ...s,
            id: (s.id ?? s._id) as string,
          })));
        }
      } catch {
        console.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.schoolId]);

  useEffect(() => {
    if (!loading) {
      fetchRecords();
    }
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
    try {
      await apiClient.post('/attendance/discipline', {
        ...data,
        schoolId: user?.schoolId,
      });
      toast.success('Discipline record created');
      setOpen(false);
      await fetchRecords();
    } catch {
      toast.error('Failed to create discipline record');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/attendance/discipline/${id}`);
      toast.success('Discipline record deleted');
      await fetchRecords();
    } catch {
      toast.error('Failed to delete discipline record');
    }
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
        onDelete={handleDelete}
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
