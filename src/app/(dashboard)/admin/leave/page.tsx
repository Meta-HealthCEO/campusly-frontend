'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLeave } from '@/hooks/useLeave';
import { useLeaveAdmin } from '@/hooks/useLeaveAdmin';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  LeaveRequestTable, LeaveReviewDialog, LeaveBalanceCards,
  LeaveCalendarView, LeaveReportCharts,
} from '@/components/leave';
import { CalendarDays, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { LeaveRequest } from '@/types';

export default function AdminLeavePage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const {
    requests, requestsLoading, fetchRequests,
    reviewRequest,
    balances, balancesLoading, fetchBalances,
    calendar, calendarLoading, fetchCalendar,
  } = useLeave();

  const { report, reportLoading, fetchReport } = useLeaveAdmin();

  const [activeTab, setActiveTab] = useState<string | number>('requests');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calendar state
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  // Report year
  const [reportYear, setReportYear] = useState(now.getFullYear());

  // ─── Fetch data per tab ────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    if (activeTab === 'requests') {
      fetchRequests(schoolId, { status: statusFilter === 'all' ? undefined : statusFilter });
    }
  }, [schoolId, activeTab, statusFilter, fetchRequests]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'balances') return;
    fetchBalances(schoolId, { year: now.getFullYear() });
  }, [schoolId, activeTab, fetchBalances, now.getFullYear]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'calendar') return;
    const toISODate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const start = toISODate(new Date(calYear, calMonth, 1));
    const end = toISODate(new Date(calYear, calMonth + 1, 0));
    fetchCalendar(schoolId, start, end);
  }, [schoolId, activeTab, calMonth, calYear, fetchCalendar]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'reports') return;
    fetchReport(schoolId, { year: reportYear });
  }, [schoolId, activeTab, reportYear, fetchReport]);

  const handleReview = useCallback((req: LeaveRequest) => {
    setReviewTarget(req);
    setReviewOpen(true);
  }, []);

  const handleReviewConfirm = useCallback(async (
    id: string,
    data: { status: 'approved' | 'declined'; reviewComment?: string },
  ) => {
    setSaving(true);
    try {
      await reviewRequest(id, data);
      toast.success(`Leave request ${data.status}`);
      setReviewOpen(false);
      if (schoolId) fetchRequests(schoolId, { status: statusFilter === 'all' ? undefined : statusFilter });
    } catch (err: unknown) {
      toast.error('Failed to review request');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [reviewRequest, schoolId, statusFilter, fetchRequests]);

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
      <PageHeader title="Staff Leave Management" description="Review requests, balances, and leave analytics" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ── Requests Tab ──────────────────────────────────────────── */}
        <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as string)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestsLoading ? (
            <LoadingSpinner />
          ) : requests.length === 0 ? (
            <EmptyState icon={FileText} title="No leave requests" description="No requests match the current filter." />
          ) : (
            <LeaveRequestTable requests={requests} onReview={handleReview} />
          )}
        </TabsContent>

        {/* ── Balances Tab ──────────────────────────────────────────── */}
        <TabsContent value="balances" className="space-y-4 mt-4">
          {balancesLoading ? <LoadingSpinner /> : <LeaveBalanceCards balances={balances} />}
        </TabsContent>

        {/* ── Calendar Tab ──────────────────────────────────────────── */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium min-w-30 text-center">
              {new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <Button size="sm" variant="outline" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          {calendarLoading ? <LoadingSpinner /> : (
            <LeaveCalendarView entries={calendar} year={calYear} month={calMonth} />
          )}
        </TabsContent>

        {/* ── Reports Tab ───────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className="w-full sm:w-28"
              min={2020}
              max={2100}
            />
          </div>
          {reportLoading ? <LoadingSpinner /> : report ? (
            <LeaveReportCharts report={report} />
          ) : (
            <EmptyState icon={CalendarDays} title="No report data" description="Select a year to view leave analytics." />
          )}
        </TabsContent>
      </Tabs>

      <LeaveReviewDialog
        request={reviewTarget}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onConfirm={handleReviewConfirm}
        saving={saving}
      />
    </div>
  );
}
