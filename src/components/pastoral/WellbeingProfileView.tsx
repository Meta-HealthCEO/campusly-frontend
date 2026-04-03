'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, BookOpen, Calendar, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  StudentWellbeingProfile,
  PastoralRiskLevel,
  ReferralReason,
  ReferralUrgency,
  PastoralReferralStatus,
} from '@/types';

interface WellbeingProfileViewProps {
  profile: StudentWellbeingProfile;
}

function riskVariant(level: PastoralRiskLevel): 'default' | 'secondary' | 'destructive' {
  if (level === 'high') return 'destructive';
  if (level === 'medium') return 'secondary';
  return 'default';
}

function urgencyVariant(u: ReferralUrgency): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (u === 'critical' || u === 'high') return 'destructive';
  if (u === 'medium') return 'secondary';
  return 'outline';
}

function statusVariant(
  s: PastoralReferralStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'resolved' || s === 'closed') return 'secondary';
  if (s === 'referred') return 'outline';
  return 'default';
}

function reasonLabel(r: ReferralReason): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SectionRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function WellbeingProfileView({ profile }: WellbeingProfileViewProps) {
  const { student, referrals, sessions, attendance, academic, behaviour, riskLevel, riskFactors } =
    profile;

  return (
    <div className="space-y-4">
      {/* Student Header */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold truncate">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">
                Grade {student.grade}{student.class ? ` · ${student.class}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant={riskVariant(riskLevel)}>
                <Shield className="h-3 w-3 mr-1" />
                {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
              </Badge>
            </div>
          </div>

          {riskFactors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {riskFactors.map((factor) => (
                <span
                  key={factor}
                  className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive rounded px-2 py-0.5"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {factor}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="referrals">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="behaviour">Behaviour</TabsTrigger>
        </TabsList>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="mt-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{referrals.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{referrals.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{referrals.resolved}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>

              {referrals.recent.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Recent
                  </p>
                  {referrals.recent.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center gap-2 py-1.5 border-b last:border-0"
                    >
                      <span className="text-sm flex-1 truncate">{reasonLabel(r.reason)}</span>
                      <Badge variant={urgencyVariant(r.urgency)} className="text-xs">
                        {r.urgency}
                      </Badge>
                      <Badge variant={statusVariant(r.status)} className="text-xs">
                        {r.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              <SectionRow label="Total Sessions" value={sessions.total} />
              <SectionRow
                label="Last Session"
                value={sessions.lastSessionDate ? formatDate(sessions.lastSessionDate) : 'None'}
              />
              <SectionRow
                label="Next Follow-up"
                value={sessions.nextFollowUp ? formatDate(sessions.nextFollowUp) : 'None scheduled'}
              />
              {Object.keys(sessions.sessionTypes).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    By Type
                  </p>
                  {Object.entries(sessions.sessionTypes).map(([type, count]) => (
                    <SectionRow key={type} label={type.replace(/_/g, ' ')} value={count ?? 0} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              <SectionRow
                label="Overall Rate"
                value={`${attendance.overallRate.toFixed(1)}%`}
              />
              <SectionRow label="Recent Absences" value={attendance.recentAbsences} />
              <SectionRow label="Pattern" value={attendance.pattern ?? 'None detected'} />
              <SectionRow label="Trend" value={attendance.trend ?? '—'} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Tab */}
        <TabsContent value="academic" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              <SectionRow
                label="Overall Average"
                value={`${academic.overallAverage.toFixed(1)}%`}
              />
              <SectionRow
                label="Last Term Average"
                value={`${academic.lastTermAverage.toFixed(1)}%`}
              />
              <SectionRow
                label="Trend"
                value={academic.trend ?? '—'}
              />
              {academic.failingSubjects.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                    Failing Subjects
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {academic.failingSubjects.map((s) => (
                      <Badge key={s} variant="destructive" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {academic.failingSubjects.length === 0 && (
                <div className="flex items-center gap-1.5 mt-3 text-sm text-green-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  No failing subjects
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behaviour Tab */}
        <TabsContent value="behaviour" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3 text-center mb-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">{behaviour.merits}</p>
                  <p className="text-xs text-muted-foreground">Merits</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{behaviour.demerits}</p>
                  <p className="text-xs text-muted-foreground">Demerits</p>
                </div>
              </div>

              {behaviour.recentIncidents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    Recent Incidents
                  </p>
                  {behaviour.recentIncidents.map((inc, i) => (
                    <div key={i} className="py-1.5 border-b last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{inc.type}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" />
                          {formatDate(inc.date)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {inc.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
