'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ApplicationKanban } from '@/components/admissions/ApplicationKanban';
import { ApplicationListView } from '@/components/admissions/ApplicationListView';
import { ApplicationDetailView } from '@/components/admissions/ApplicationDetailView';
import { InterviewScheduleDialog } from '@/components/admissions/InterviewScheduleDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdmissionsAdmin } from '@/hooks/useAdmissionsAdmin';
import { LayoutGrid, List, Search } from 'lucide-react';
import type { AdmissionApplication, AdmissionStatus } from '@/types/admissions';

export default function AdminAdmissionsPage() {
  const {
    applications, total, loading,
    fetchApplications, updateStatus, scheduleInterview, bulkAction,
  } = useAdmissionsAdmin();

  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [interviewDialog, setInterviewDialog] = useState(false);

  useEffect(() => {
    const filters: Record<string, string | number> = { limit: 200 };
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (search) filters.search = search;
    fetchApplications(filters);
  }, [fetchApplications, statusFilter, search]);

  const handleStatusChange = useCallback(async (
    id: string,
    status: AdmissionStatus,
    notes: string,
    notify: boolean,
  ) => {
    await updateStatus(id, status, notes, notify);
    fetchApplications({ limit: 200, status: statusFilter !== 'all' ? statusFilter : undefined });
  }, [updateStatus, fetchApplications, statusFilter]);

  const handleBulkAction = useCallback(async (ids: string[], action: 'accepted' | 'rejected') => {
    await bulkAction(ids, action);
    fetchApplications({ limit: 200 });
  }, [bulkAction, fetchApplications]);

  const handleInterviewSchedule = useCallback(async (data: {
    interviewDate: string;
    interviewType: 'in_person' | 'virtual';
    interviewerName: string;
    venue?: string;
    notes?: string;
    notifyParent?: boolean;
  }) => {
    if (!selectedApp) return;
    await scheduleInterview(selectedApp.id || selectedApp._id, data);
    fetchApplications({ limit: 200 });
    setInterviewDialog(false);
  }, [scheduleInterview, fetchApplications, selectedApp]);

  if (selectedApp && !interviewDialog) {
    return (
      <div className="space-y-4">
        <ApplicationDetailView
          application={selectedApp}
          onScheduleInterview={() => setInterviewDialog(true)}
          onBack={() => setSelectedApp(null)}
        />
        <InterviewScheduleDialog
          open={interviewDialog}
          onOpenChange={setInterviewDialog}
          applicationNumber={selectedApp.applicationNumber}
          onSubmit={handleInterviewSchedule}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Admissions Pipeline" description={`${total} applications`} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search applicants..."
            className="pl-9 w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val: unknown) => setStatusFilter((val as string) ?? 'all')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="interview_scheduled">Interview</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 ml-auto">
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : view === 'kanban' ? (
        <ApplicationKanban
          applications={applications}
          onStatusChange={handleStatusChange}
          onCardClick={setSelectedApp}
        />
      ) : (
        <ApplicationListView
          applications={applications}
          onCardClick={setSelectedApp}
          onBulkAction={handleBulkAction}
        />
      )}

      {selectedApp && (
        <InterviewScheduleDialog
          open={interviewDialog}
          onOpenChange={setInterviewDialog}
          applicationNumber={selectedApp.applicationNumber}
          onSubmit={handleInterviewSchedule}
        />
      )}
    </div>
  );
}
