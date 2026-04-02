'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Sun, Moon, Calendar, BookOpen, ClipboardList,
  AlertTriangle, Award, ShoppingBag, Wallet, CheckCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { MorningDigest, EveningDigest, WeeklyDigest } from '@/types';

// ─── Morning ───────────────────────────────────────────────────────────────

export function MorningDigestCard({ digest, loading }: { digest: MorningDigest | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (!digest) return <EmptyState icon={Sun} title="No morning digest" description="Select a child and click Preview to see their morning brief." />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">Morning Brief &mdash; {digest.studentName}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">{digest.date}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timetable */}
        <Section title="Today's Timetable" icon={Calendar}>
          {digest.timetable.length > 0 ? (
            <div className="space-y-1">
              {digest.timetable.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span className="font-medium">P{t.period}: {t.subject}</span>
                  <span className="text-muted-foreground text-xs">{t.startTime}-{t.endTime} {t.room && `(${t.room})`}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No timetable entries for today.</p>}
        </Section>

        {/* Homework Due */}
        <Section title="Homework Due Today" icon={BookOpen}>
          {digest.homeworkDue.length > 0 ? (
            <ul className="space-y-1">
              {digest.homeworkDue.map((h, i) => (
                <li key={i} className="text-sm flex justify-between">
                  <span>{h.title} <span className="text-muted-foreground">({h.subject})</span></span>
                  <Badge variant="secondary" className="text-[10px]">{h.totalMarks} marks</Badge>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No homework due today.</p>}
        </Section>

        {/* Assessments */}
        <Section title="Upcoming Assessments" icon={ClipboardList}>
          {digest.upcomingAssessments.length > 0 ? (
            <ul className="space-y-1">
              {digest.upcomingAssessments.map((a, i) => (
                <li key={i} className="text-sm flex justify-between">
                  <span>{a.name} <span className="text-muted-foreground">({a.subject})</span></span>
                  <span className="text-xs text-muted-foreground">{formatDate(a.date, 'dd MMM')}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No upcoming assessments this week.</p>}
        </Section>

        {/* Wallet balance */}
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="h-4 w-4 text-primary" />
          <span>Wallet Balance: <strong>R{(digest.walletBalance / 100).toFixed(2)}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Evening ───────────────────────────────────────────────────────────────

export function EveningDigestCard({ digest, loading }: { digest: EveningDigest | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (!digest) return <EmptyState icon={Moon} title="No evening digest" description="Select a child and click Preview to see their evening summary." />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-500" />
          <CardTitle className="text-base">Evening Summary &mdash; {digest.studentName}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">{digest.date}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attendance */}
        <Section title="Attendance" icon={CheckCircle}>
          {digest.attendance.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {digest.attendance.map((a, i) => (
                <Badge key={i} variant={a.status === 'present' ? 'default' : 'secondary'}>
                  P{a.period}: {a.status}
                </Badge>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No attendance records for today.</p>}
        </Section>

        {/* Homework assigned */}
        <Section title="Homework Assigned Today" icon={BookOpen}>
          {digest.homeworkAssigned.length > 0 ? (
            <ul className="space-y-1">
              {digest.homeworkAssigned.map((h, i) => (
                <li key={i} className="text-sm flex justify-between">
                  <span>{h.title} <span className="text-muted-foreground">({h.subject})</span></span>
                  <span className="text-xs text-muted-foreground">Due {formatDate(h.dueDate, 'dd MMM')}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No new homework today.</p>}
        </Section>

        {/* Incidents */}
        {digest.incidents.length > 0 && (
          <Section title="Incidents" icon={AlertTriangle}>
            <ul className="space-y-1">
              {digest.incidents.map((inc, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  {inc.type === 'discipline' ? (
                    <><AlertTriangle className="h-3 w-3 text-destructive" /><span>{inc.category} &mdash; {inc.description}</span></>
                  ) : (
                    <><Award className="h-3 w-3 text-primary" /><span>{inc.type}: {inc.reason} ({inc.points} pts)</span></>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Tuck shop spending */}
        <div className="flex items-center gap-2 text-sm">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <span>Tuck Shop Spending: <strong>R{(digest.tuckshopSpending / 100).toFixed(2)}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Weekly ────────────────────────────────────────────────────────────────

export function WeeklyDigestCard({ digest, loading }: { digest: WeeklyDigest | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (!digest) return <EmptyState icon={Calendar} title="No weekly digest" description="Select a child and click Preview to see their weekly summary." />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Weekly Summary &mdash; {digest.studentName}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Week of {digest.weekOf}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attendance summary */}
        <Section title="Attendance Summary" icon={CheckCircle}>
          <div className="flex flex-wrap gap-3 text-sm">
            <span>Present: <strong>{digest.attendanceSummary.present}</strong></span>
            <span>Absent: <strong>{digest.attendanceSummary.absent}</strong></span>
            <span>Late: <strong>{digest.attendanceSummary.late}</strong></span>
            <span>Excused: <strong>{digest.attendanceSummary.excused}</strong></span>
          </div>
        </Section>

        {/* Homework completion */}
        <Section title="Homework Completion" icon={BookOpen}>
          <p className="text-sm">
            {digest.homeworkCompletion.submitted}/{digest.homeworkCompletion.total} submitted
            (<strong>{digest.homeworkCompletion.rate}%</strong>)
          </p>
        </Section>

        {/* Marks received */}
        <Section title="Marks Received" icon={Award}>
          {digest.marksReceived.length > 0 ? (
            <ul className="space-y-1">
              {digest.marksReceived.map((m, i) => (
                <li key={i} className="text-sm flex justify-between">
                  <span>{m.assessment}</span>
                  <span>{m.mark}/{m.total} ({m.percentage}%)</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No marks received this week.</p>}
        </Section>

        {/* Next week assessments */}
        <Section title="Next Week Assessments" icon={ClipboardList}>
          {digest.nextWeekAssessments.length > 0 ? (
            <ul className="space-y-1">
              {digest.nextWeekAssessments.map((a, i) => (
                <li key={i} className="text-sm flex justify-between">
                  <span>{a.name} ({a.subject})</span>
                  <span className="text-xs text-muted-foreground">{formatDate(a.date, 'dd MMM')}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No assessments scheduled for next week.</p>}
        </Section>
      </CardContent>
    </Card>
  );
}

// ─── Shared section ────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {children}
    </div>
  );
}
