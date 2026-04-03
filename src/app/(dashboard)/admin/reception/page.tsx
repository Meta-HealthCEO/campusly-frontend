'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useVisitors } from '@/hooks/useVisitors';
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
  VisitorLogTable, VisitorRegisterDialog, VisitorCheckOutDialog,
  PreRegistrationTable, PreRegisterDialog,
  LateArrivalForm, EarlyDepartureForm,
  DailyReportPanel, OnPremisesPanel,
} from '@/components/visitor';
import {
  DoorOpen, UserPlus, Clock, LogOut as LogOutIcon, FileText, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  VisitorRecord, RegisterVisitorPayload, CreatePreRegistrationPayload,
  RecordLateArrivalPayload, RecordEarlyDeparturePayload, LateArrival, EarlyDeparture,
} from '@/types';

function toLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AdminReceptionPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const {
    visitors, visitorsMeta, visitorsLoading, fetchVisitors,
    registerVisitor, checkOutVisitor,
    preRegistrations, preRegLoading, fetchPreRegistrations,
    createPreRegistration, cancelPreRegistration,
    lateArrivals, lateLoading, fetchLateArrivals, recordLateArrival,
    earlyDepartures, earlyLoading, fetchEarlyDepartures, recordEarlyDeparture,
    dailyReport, reportLoading, fetchDailyReport,
    onPremises, onPremisesCount, onPremisesLoading, fetchOnPremises,
  } = useVisitors();

  const [activeTab, setActiveTab] = useState<string | number>('log');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [checkOutTarget, setCheckOutTarget] = useState<VisitorRecord | null>(null);
  const [preRegOpen, setPreRegOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(toLocalDate());
  const [reportDate, setReportDate] = useState(toLocalDate());

  // ─── Fetch per tab ─────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    if (activeTab === 'log') {
      fetchVisitors(schoolId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        date: dateFilter,
      });
    }
  }, [schoolId, activeTab, statusFilter, dateFilter, fetchVisitors]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'pre-reg') return;
    fetchPreRegistrations(schoolId);
  }, [schoolId, activeTab, fetchPreRegistrations]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'late') return;
    fetchLateArrivals(schoolId, { date: toLocalDate() });
  }, [schoolId, activeTab, fetchLateArrivals]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'early') return;
    fetchEarlyDepartures(schoolId, { date: toLocalDate() });
  }, [schoolId, activeTab, fetchEarlyDepartures]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'report') return;
    fetchDailyReport(schoolId, reportDate);
  }, [schoolId, activeTab, reportDate, fetchDailyReport]);

  useEffect(() => {
    if (!schoolId || activeTab !== 'emergency') return;
    fetchOnPremises(schoolId);
  }, [schoolId, activeTab, fetchOnPremises]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleRegister = useCallback(async (data: RegisterVisitorPayload) => {
    setSaving(true);
    try {
      const result = await registerVisitor(data);
      toast.success(`Visitor registered. Pass: ${result.passNumber}`);
      setRegisterOpen(false);
      if (schoolId) fetchVisitors(schoolId, { date: dateFilter });
    } catch (err: unknown) {
      toast.error('Failed to register visitor');
      console.error(err);
    } finally { setSaving(false); }
  }, [registerVisitor, schoolId, dateFilter, fetchVisitors]);

  const handleCheckOut = useCallback(async (id: string, notes?: string) => {
    setSaving(true);
    try {
      const result = await checkOutVisitor(id, notes);
      toast.success(`Visitor checked out. Duration: ${result.duration ?? 'N/A'}`);
      setCheckOutTarget(null);
      if (schoolId) fetchVisitors(schoolId, { date: dateFilter });
    } catch (err: unknown) {
      toast.error('Failed to check out visitor');
      console.error(err);
    } finally { setSaving(false); }
  }, [checkOutVisitor, schoolId, dateFilter, fetchVisitors]);

  const handlePreRegister = useCallback(async (data: CreatePreRegistrationPayload) => {
    setSaving(true);
    try {
      await createPreRegistration(data);
      toast.success('Visitor pre-registered');
      setPreRegOpen(false);
      if (schoolId) fetchPreRegistrations(schoolId);
    } catch (err: unknown) {
      toast.error('Failed to pre-register visitor');
      console.error(err);
    } finally { setSaving(false); }
  }, [createPreRegistration, schoolId, fetchPreRegistrations]);

  const handleCancelPreReg = useCallback(async (id: string) => {
    try {
      await cancelPreRegistration(id);
      toast.success('Pre-registration cancelled');
      if (schoolId) fetchPreRegistrations(schoolId);
    } catch (err: unknown) {
      toast.error('Failed to cancel pre-registration');
      console.error(err);
    }
  }, [cancelPreRegistration, schoolId, fetchPreRegistrations]);

  const handleLateArrival = useCallback(async (data: RecordLateArrivalPayload) => {
    setSaving(true);
    try {
      const result = await recordLateArrival(data);
      const la = result as LateArrival;
      toast.success(`Late arrival recorded (${la.minutesLate ?? 0} min late)`);
      if (schoolId) fetchLateArrivals(schoolId, { date: toLocalDate() });
    } catch (err: unknown) {
      toast.error('Failed to record late arrival');
      console.error(err);
    } finally { setSaving(false); }
  }, [recordLateArrival, schoolId, fetchLateArrivals]);

  const handleEarlyDeparture = useCallback(async (data: RecordEarlyDeparturePayload) => {
    setSaving(true);
    try {
      await recordEarlyDeparture(data);
      toast.success('Early departure recorded');
      if (schoolId) fetchEarlyDepartures(schoolId, { date: toLocalDate() });
    } catch (err: unknown) {
      toast.error('Failed to record early departure');
      console.error(err);
    } finally { setSaving(false); }
  }, [recordEarlyDeparture, schoolId, fetchEarlyDepartures]);

  return (
    <div className="space-y-6">
      <PageHeader title="Visitor Management" description="Gate control, visitor log, and student movement tracking">
        <Button onClick={() => setRegisterOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Check In Visitor
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="log"><DoorOpen className="h-4 w-4 mr-1" /> Visitor Log</TabsTrigger>
          <TabsTrigger value="pre-reg">Pre-Registration</TabsTrigger>
          <TabsTrigger value="late"><Clock className="h-4 w-4 mr-1" /> Late Arrivals</TabsTrigger>
          <TabsTrigger value="early"><LogOutIcon className="h-4 w-4 mr-1" /> Early Departures</TabsTrigger>
          <TabsTrigger value="report"><FileText className="h-4 w-4 mr-1" /> Daily Report</TabsTrigger>
          <TabsTrigger value="emergency"><ShieldAlert className="h-4 w-4 mr-1" /> Emergency</TabsTrigger>
        </TabsList>

        {/* ── Visitor Log ────────────────────────────────────────── */}
        <TabsContent value="log" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="date" value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-44"
            />
            <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as string)}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="checked_in">On Premises</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {visitorsLoading ? <LoadingSpinner /> : visitors.length === 0 ? (
            <EmptyState icon={DoorOpen} title="No visitors" description="No visitor records for the selected filters." />
          ) : (
            <VisitorLogTable visitors={visitors} onCheckOut={(v: VisitorRecord) => setCheckOutTarget(v)} />
          )}
        </TabsContent>

        {/* ── Pre-Registration ───────────────────────────────────── */}
        <TabsContent value="pre-reg" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setPreRegOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Pre-Register</Button>
          </div>
          {preRegLoading ? <LoadingSpinner /> : preRegistrations.length === 0 ? (
            <EmptyState icon={DoorOpen} title="No pre-registrations" description="No expected visitors." />
          ) : (
            <PreRegistrationTable items={preRegistrations} onCancel={handleCancelPreReg} />
          )}
        </TabsContent>

        {/* ── Late Arrivals ──────────────────────────────────────── */}
        <TabsContent value="late" className="space-y-4 mt-4">
          <LateArrivalForm onSubmit={handleLateArrival} schoolId={schoolId} saving={saving} />
          {lateLoading ? <LoadingSpinner /> : lateArrivals.length === 0 ? (
            <EmptyState icon={Clock} title="No late arrivals today" description="No students have been logged late." />
          ) : (
            <RecentLateArrivals items={lateArrivals} />
          )}
        </TabsContent>

        {/* ── Early Departures ───────────────────────────────────── */}
        <TabsContent value="early" className="space-y-4 mt-4">
          <EarlyDepartureForm onSubmit={handleEarlyDeparture} schoolId={schoolId} saving={saving} />
          {earlyLoading ? <LoadingSpinner /> : earlyDepartures.length === 0 ? (
            <EmptyState icon={LogOutIcon} title="No early departures today" description="No early departures logged." />
          ) : (
            <RecentEarlyDepartures items={earlyDepartures} />
          )}
        </TabsContent>

        {/* ── Daily Report ───────────────────────────────────────── */}
        <TabsContent value="report" className="space-y-4 mt-4">
          <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full sm:w-44" />
          <DailyReportPanel report={dailyReport} loading={reportLoading} />
        </TabsContent>

        {/* ── Emergency ──────────────────────────────────────────── */}
        <TabsContent value="emergency" className="mt-4">
          <OnPremisesPanel visitors={onPremises} totalCount={onPremisesCount} loading={onPremisesLoading} schoolId={schoolId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <VisitorRegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} onSubmit={handleRegister} schoolId={schoolId} saving={saving} />
      <VisitorCheckOutDialog open={!!checkOutTarget} onOpenChange={(o) => { if (!o) setCheckOutTarget(null); }} visitor={checkOutTarget} onConfirm={handleCheckOut} saving={saving} />
      <PreRegisterDialog open={preRegOpen} onOpenChange={setPreRegOpen} onSubmit={handlePreRegister} schoolId={schoolId} saving={saving} />
    </div>
  );
}

// ─── Inline sub-components (small, page-specific) ────────────────

function getStudentName(item: LateArrival | EarlyDeparture): string {
  const sid = 'studentId' in item ? item.studentId : null;
  if (sid && typeof sid === 'object' && 'firstName' in sid) {
    return `${sid.firstName} ${sid.lastName}`;
  }
  return String(sid ?? '—');
}

function RecentLateArrivals({ items }: { items: LateArrival[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Today&apos;s Late Arrivals</h3>
      <div className="divide-y rounded-lg border">
        {items.map((la) => (
          <div key={la.id ?? la._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 text-sm">
            <span className="font-medium truncate">{getStudentName(la)}</span>
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <span>{new Date(la.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-destructive font-medium">{la.minutesLate} min late</span>
              <span className="capitalize">{la.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentEarlyDepartures({ items }: { items: EarlyDeparture[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Today&apos;s Early Departures</h3>
      <div className="divide-y rounded-lg border">
        {items.map((ed) => (
          <div key={ed.id ?? ed._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 text-sm">
            <span className="font-medium truncate">{getStudentName(ed)}</span>
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <span>{new Date(ed.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="capitalize">{ed.reason.replace('_', ' ')}</span>
              <span>Collected by: {ed.collectedBy}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
