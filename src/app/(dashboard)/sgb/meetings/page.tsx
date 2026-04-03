'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { MeetingList, MeetingFormDialog } from '@/components/sgb';
import { useSgbMeetings, useSgbMeetingMutations } from '@/hooks/useSgbMeetings';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { SgbMeeting, CreateMeetingPayload } from '@/types';

export default function SgbMeetingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { meetings, loading, refetch } = useSgbMeetings(statusFilter);
  const { createMeeting, deleteMeeting } = useSgbMeetingMutations();

  const handleCreate = useCallback(async (data: CreateMeetingPayload) => {
    await createMeeting(data);
    toast.success('Meeting scheduled successfully');
    refetch();
  }, [createMeeting, refetch]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this meeting?')) return;
    await deleteMeeting(id);
    toast.success('Meeting deleted');
    refetch();
  }, [deleteMeeting, refetch]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="SGB Meetings" description="Scheduled and past governing body meetings">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(val: unknown) => setStatusFilter(val as string)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Meeting
            </Button>
          )}
        </div>
      </PageHeader>

      <MeetingList
        meetings={meetings}
        isAdmin={isAdmin}
        onView={(m: SgbMeeting) => router.push(`/sgb/meetings/${m.id}`)}
        onDelete={isAdmin ? handleDelete : undefined}
      />

      {isAdmin && (
        <MeetingFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
