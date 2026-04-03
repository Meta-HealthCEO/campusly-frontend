'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchInput } from '@/components/shared/SearchInput';
import { CaseloadDashboard } from '@/components/pastoral/CaseloadDashboard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ReferralInbox,
  ReferralDetailDrawer,
  ResolutionDialog,
  SessionLogList,
  SessionCreateDialog,
  SessionDetailCard,
  OverdueFollowUpAlert,
  StudentCaseRow,
  ReferralReasonChart,
  SessionsPerMonthChart,
  OutcomeChart,
} from '@/components/pastoral';
import { ShieldAlert, Plus } from 'lucide-react';
import { usePastoralReferrals } from '@/hooks/usePastoralReferrals';
import { usePastoralSessions } from '@/hooks/usePastoralSessions';
import { usePastoralCare } from '@/hooks/usePastoralCare';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PastoralReferral, CounselorSession, ResolveReferralPayload } from '@/types';

export default function CounselorDashboardPage() {
  const { hasPermission } = useAuthStore();
  const isCounselor = hasPermission('isCounselor');
  const router = useRouter();

  const { referrals, referralsLoading, fetchReferrals, updateReferral, resolveReferral } =
    usePastoralReferrals();
  const { sessions, sessionsLoading, fetchSessions, createSession } = usePastoralSessions();
  const { caseload, caseloadLoading, fetchCaseload, report, reportLoading, fetchReport } =
    usePastoralCare();

  const [selectedReferral, setSelectedReferral] = useState<PastoralReferral | null>(null);
  const [resolveTarget, setResolveTarget] = useState<PastoralReferral | null>(null);
  const [selectedSession, setSelectedSession] = useState<CounselorSession | null>(null);
  const [sessionCreateOpen, setSessionCreateOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  const loadAll = useCallback(async () => {
    await Promise.allSettled([fetchCaseload(), fetchReferrals(), fetchSessions()]);
  }, [fetchCaseload, fetchReferrals, fetchSessions]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleResolve = async (id: string, data: ResolveReferralPayload) => {
    await resolveReferral(id, data);
    setResolveTarget(null);
    setSelectedReferral(null);
  };

  const handleCreateSession = async (data: Parameters<typeof createSession>[0]) => {
    await createSession(data);
    setSessionCreateOpen(false);
  };

  const handleFetchReport = async () => {
    await fetchReport({ startDate: reportFrom, endDate: reportTo });
  };

  if (!isCounselor) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access Restricted"
        description="This section is only accessible to school counselors."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Counselor Dashboard" description="Manage referrals, sessions, and student wellbeing" />

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="referrals">
            Referrals
            {referrals.filter((r) => r.status === 'referred').length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-xs">
                {referrals.filter((r) => r.status === 'referred').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ── Dashboard ─────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {caseloadLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <CaseloadDashboard caseload={caseload} />
              {caseload && caseload.overdueList && caseload.overdueList.length > 0 && (
                <OverdueFollowUpAlert overdueList={caseload.overdueList} />
              )}
              <div className="space-y-2">
                {(caseload?.cases ?? []).length === 0 ? (
                  <EmptyState icon={ShieldAlert} title="No active cases" description="No open referrals at this time." />
                ) : (
                  (caseload?.cases ?? []).map((c) => (
                    <StudentCaseRow
                      key={c.studentId.id}
                      caseItem={c}
                      onClick={() => router.push(`/teacher/pastoral/students/${c.studentId.id}`)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Referrals ─────────────────────────────────── */}
        <TabsContent value="referrals" className="space-y-4 mt-4">
          {referralsLoading ? (
            <LoadingSpinner />
          ) : (
            <ReferralInbox
              referrals={referrals}
              onView={setSelectedReferral}
            />
          )}
          <ReferralDetailDrawer
            referral={selectedReferral}
            onResolve={(id) => {
              const r = referrals.find((x) => x.id === id) ?? null;
              setResolveTarget(r);
              setSelectedReferral(null);
            }}
          />
          <ResolutionDialog
            referral={resolveTarget}
            open={resolveTarget !== null}
            onOpenChange={(open) => { if (!open) setResolveTarget(null); }}
            onSubmit={handleResolve}
          />
        </TabsContent>

        {/* ── Sessions ──────────────────────────────────── */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setSessionCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Log Session
            </Button>
          </div>
          {sessionsLoading ? (
            <LoadingSpinner />
          ) : sessions.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No sessions logged" description="Use the button above to log a counseling session." />
          ) : (
            <SessionLogList sessions={sessions} onView={setSelectedSession} />
          )}
          {selectedSession && (
            <SessionDetailCard session={selectedSession} />
          )}
          <SessionCreateDialog
            open={sessionCreateOpen}
            onOpenChange={setSessionCreateOpen}
            onSubmit={handleCreateSession}
          />
        </TabsContent>

        {/* ── Students ──────────────────────────────────── */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <SearchInput
            value={studentSearch}
            onChange={setStudentSearch}
            placeholder="Search students by name or grade…"
          />
          {(caseload?.cases ?? [])
            .filter((c) =>
              studentSearch.trim() === '' ||
              `${c.studentId.firstName} ${c.studentId.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()),
            )
            .map((c) => (
              <StudentCaseRow
                key={c.studentId.id}
                caseItem={c}
                onClick={() => router.push(`/teacher/pastoral/students/${c.studentId.id}`)}
              />
            ))}
          {(caseload?.cases ?? []).filter((c) =>
            studentSearch.trim() === '' ||
            `${c.studentId.firstName} ${c.studentId.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()),
          ).length === 0 && (
            <EmptyState
              icon={ShieldAlert}
              title="No students found"
              description="No active cases match your search."
            />
          )}
        </TabsContent>

        {/* ── Reports ───────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="report-from">From</Label>
                  <Input
                    id="report-from"
                    type="date"
                    value={reportFrom}
                    onChange={(e) => setReportFrom(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="report-to">To</Label>
                  <Input
                    id="report-to"
                    type="date"
                    value={reportTo}
                    onChange={(e) => setReportTo(e.target.value)}
                  />
                </div>
                <Button onClick={handleFetchReport} disabled={reportLoading}>
                  {reportLoading ? 'Loading…' : 'Generate Report'}
                </Button>
              </div>
            </CardContent>
          </Card>
          {report ? (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              <ReferralReasonChart report={report} />
              <SessionsPerMonthChart report={report} />
              <OutcomeChart report={report} />
            </div>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No report data"
              description="Select a date range and click Generate Report."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
