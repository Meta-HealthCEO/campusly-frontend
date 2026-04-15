'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DataTable } from '@/components/shared/DataTable';
import { Plus, Calendar } from 'lucide-react';
import {
  SubstituteForm,
  SubstituteDeclineDialog,
} from '@/components/attendance';
import { buildSubstituteColumns } from '@/components/attendance/substitute-columns';
import { useSubstitutes } from '@/hooks/useSubstitutes';
import type { SubstituteTeacher, SubstituteStatus } from '@/types';

function AdminSubstitutesPageInner() {
  const searchParams = useSearchParams();
  const queryDate = searchParams.get('date');
  const queryTeacherId = searchParams.get('teacherId');
  const queryLeaveRequestId = searchParams.get('leaveRequestId');
  const hasQueryPrefill = Boolean(queryDate || queryTeacherId || queryLeaveRequestId);

  const initialEditTarget = hasQueryPrefill
    ? ({
      date: queryDate ?? new Date().toISOString(),
      originalTeacherId: queryTeacherId ?? '',
      leaveRequestId: queryLeaveRequestId ?? undefined,
    } as unknown as SubstituteTeacher)
    : null;

  const [open, setOpen] = useState(hasQueryPrefill);
  const [editTarget, setEditTarget] = useState<SubstituteTeacher | null>(initialEditTarget);
  const [declineTarget, setDeclineTarget] = useState<SubstituteTeacher | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState<string | number>('pending');

  const {
    records, staff, classes, loading,
    fetchSubstitutes, initialize,
    createSubstitute, updateSubstitute,
    approveSubstitute, declineSubstitute,
    deleteSubstitute, fetchSuggestions,
  } = useSubstitutes();

  // Initial load
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Refetch when date filter changes
  useEffect(() => {
    if (loading) return;
    fetchSubstitutes(dateFilter ? { date: dateFilter } : undefined);
  }, [dateFilter, loading, fetchSubstitutes]);


  const handleSubmit = useCallback(async (data: Parameters<typeof createSubstitute>[0]) => {
    if (editTarget && editTarget._id) {
      await updateSubstitute(editTarget._id, data);
    } else {
      await createSubstitute(data);
    }
    setOpen(false);
    setEditTarget(null);
  }, [editTarget, createSubstitute, updateSubstitute]);

  const handleApprove = useCallback(async (id: string) => {
    await approveSubstitute(id);
  }, [approveSubstitute]);

  const handleDeclineConfirm = useCallback(async (reason: string) => {
    if (!declineTarget) return;
    await declineSubstitute(declineTarget._id, reason);
    setDeclineTarget(null);
  }, [declineTarget, declineSubstitute]);

  const handleEdit = useCallback((sub: SubstituteTeacher) => {
    setEditTarget(sub);
    setOpen(true);
  }, []);

  const handleDecline = useCallback((sub: SubstituteTeacher) => {
    setDeclineTarget(sub);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteSubstitute(id);
  }, [deleteSubstitute]);

  const handleNewClick = useCallback(() => {
    setEditTarget(null);
    setOpen(true);
  }, []);

  const columns = useMemo(
    () => buildSubstituteColumns({
      onApprove: handleApprove,
      onDecline: handleDecline,
      onEdit: handleEdit,
      onDelete: handleDelete,
    }),
    [handleApprove, handleDecline, handleEdit, handleDelete],
  );

  const filtered = useMemo(() => {
    if (activeTab === 'all') return records;
    const status = activeTab as SubstituteStatus;
    return records.filter((r) => r.status === status);
  }, [records, activeTab]);

  const counts = useMemo(() => ({
    pending: records.filter((r) => r.status === 'pending').length,
    approved: records.filter((r) => r.status === 'approved').length,
    all: records.length,
  }), [records]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Substitute Teachers"
        description="Manage substitute teacher assignments and approvals"
      >
        <Button onClick={handleNewClick}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Substitute
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-40"
            placeholder="Filter by date"
          />
        </div>
        {dateFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>
            Clear
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            searchKey="reason"
            searchPlaceholder="Search by reason..."
          />
        </TabsContent>
      </Tabs>

      <SubstituteForm
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditTarget(null); }}
        staff={staff}
        classes={classes}
        initialData={editTarget ?? undefined}
        onSubmit={handleSubmit}
        onFetchSuggestions={fetchSuggestions}
      />

      <SubstituteDeclineDialog
        open={declineTarget !== null}
        onOpenChange={(v) => { if (!v) setDeclineTarget(null); }}
        onConfirm={handleDeclineConfirm}
      />
    </div>
  );
}

export default function AdminSubstitutesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminSubstitutesPageInner />
    </Suspense>
  );
}
