'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLeave } from '@/hooks/useLeave';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  LeaveRequestTable, LeaveRequestDialog,
  LeaveBalanceCards, LeaveCalendarView,
} from '@/components/leave';
import { CalendarDays, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherLeavePage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const userId = user?.id ?? '';

  const {
    requests, requestsLoading, fetchRequests,
    createRequest, cancelRequest,
    balances, balancesLoading, fetchBalances,
    calendar, calendarLoading, fetchCalendar,
  } = useLeave();

  const [activeTab, setActiveTab] = useState<string | number>('my-leave');
  const [applyOpen, setApplyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calendar state
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  // ─── Fetch data per tab ────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    if (activeTab === 'my-leave') {
      fetchRequests(schoolId, { staffId: userId });
    }
  }, [schoolId, userId, activeTab, fetchRequests]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'my-balances') return;
    fetchBalances(schoolId, { staffId: userId, year: now.getFullYear() });
  }, [schoolId, userId, activeTab, fetchBalances, now.getFullYear]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'calendar') return;
    const start = new Date(calYear, calMonth, 1).toISOString().slice(0, 10);
    const end = new Date(calYear, calMonth + 1, 0).toISOString().slice(0, 10);
    fetchCalendar(schoolId, start, end);
  }, [schoolId, activeTab, calMonth, calYear, fetchCalendar]);

  const handleApply = useCallback(async (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    isHalfDay: boolean;
    halfDayPeriod: 'morning' | 'afternoon' | null;
    documentUrl: string | null;
    substituteTeacherId: string | null;
  }) => {
    setSaving(true);
    try {
      await createRequest({ ...data, schoolId });
      toast.success('Leave request submitted');
      setApplyOpen(false);
      fetchRequests(schoolId, { staffId: userId });
    } catch (err: unknown) {
      toast.error('Failed to submit leave request');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [createRequest, schoolId, userId, fetchRequests]);

  const handleCancel = useCallback(async (request: { id: string }) => {
    try {
      await cancelRequest(request.id);
      toast.success('Leave request cancelled');
      fetchRequests(schoolId, { staffId: userId });
    } catch (err: unknown) {
      toast.error('Failed to cancel request');
      console.error(err);
    }
  }, [cancelRequest, schoolId, userId, fetchRequests]);

  const prevMonth = useCallback(() => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }, [calMonth]);

  return (
    <div className="space-y-6">
      <PageHeader title="My Leave" description="Apply for leave and view your balances">
        <Button onClick={() => setApplyOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Apply for Leave
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-leave">My Leave</TabsTrigger>
          <TabsTrigger value="my-balances">My Balances</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* ── My Leave Tab ──────────────────────────────────────────── */}
        <TabsContent value="my-leave" className="space-y-4 mt-4">
          {requestsLoading ? (
            <LoadingSpinner />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No leave requests"
              description="You haven't submitted any leave requests yet."
              action={
                <Button onClick={() => setApplyOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Apply for Leave
                </Button>
              }
            />
          ) : (
            <LeaveRequestTable requests={requests} onCancel={handleCancel} showStaffName={false} />
          )}
        </TabsContent>

        {/* ── Balances Tab ──────────────────────────────────────────── */}
        <TabsContent value="my-balances" className="space-y-4 mt-4">
          {balancesLoading ? <LoadingSpinner /> : <LeaveBalanceCards balances={balances} staffId={userId} />}
        </TabsContent>

        {/* ── Calendar Tab ──────────────────────────────────────────── */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <Button size="sm" variant="outline" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          {calendarLoading ? <LoadingSpinner /> : (
            <LeaveCalendarView entries={calendar} year={calYear} month={calMonth} />
          )}
        </TabsContent>
      </Tabs>

      <LeaveRequestDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        onSubmit={handleApply}
        saving={saving}
      />
    </div>
  );
}
