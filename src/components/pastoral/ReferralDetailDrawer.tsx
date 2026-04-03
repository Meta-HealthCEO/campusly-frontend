'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  User,
} from 'lucide-react';
import type {
  PastoralReferral,
  ReferralReason,
  ReferralUrgency,
  PastoralReferralStatus,
  ReferralOutcome,
} from '@/types';

interface ReferralDetailDrawerProps {
  referral: PastoralReferral | null;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

function reasonLabel(r: ReferralReason): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

function outcomeLabel(o: ReferralOutcome): string {
  const labels: Record<ReferralOutcome, string> = {
    positive: 'Positive',
    ongoing: 'Ongoing',
    referred_external: 'Referred Externally',
    no_further_action: 'No Further Action',
  };
  return labels[o] ?? o;
}

function outcomeVariant(
  o: ReferralOutcome,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (o === 'positive') return 'default';
  if (o === 'referred_external') return 'secondary';
  return 'outline';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TimelineEvent {
  label: string;
  date: string;
  icon: React.ReactNode;
}

function buildTimeline(referral: PastoralReferral): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      label: 'Referred',
      date: referral.createdAt,
      icon: <FileText className="h-3.5 w-3.5" />,
    },
  ];

  if (referral.status !== 'referred') {
    events.push({
      label: 'Acknowledged',
      date: referral.updatedAt,
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    });
  }

  if (referral.status === 'in_progress') {
    events.push({
      label: 'In Progress',
      date: referral.updatedAt,
      icon: <Clock className="h-3.5 w-3.5" />,
    });
  }

  if (referral.resolvedAt) {
    events.push({
      label: 'Resolved',
      date: referral.resolvedAt,
      icon: <CheckCircle className="h-3.5 w-3.5 text-green-600" />,
    });
  }

  return events;
}

export function ReferralDetailDrawer({
  referral,
  onAcknowledge,
  onResolve,
}: ReferralDetailDrawerProps) {
  if (!referral) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a referral to view details</p>
        </CardContent>
      </Card>
    );
  }

  const studentName = `${referral.studentId.firstName} ${referral.studentId.lastName}`;
  const referrerName = `${referral.referredBy.firstName} ${referral.referredBy.lastName}`;
  const timeline = buildTimeline(referral);

  const canAcknowledge = referral.status === 'referred';
  const canResolve =
    referral.status === 'acknowledged' || referral.status === 'in_progress';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base truncate">{studentName}</CardTitle>
            {referral.studentId.grade && (
              <p className="text-sm text-muted-foreground">Grade {referral.studentId.grade}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{reasonLabel(referral.reason)}</Badge>
            <Badge variant={urgencyVariant(referral.urgency)}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {referral.urgency.charAt(0).toUpperCase() + referral.urgency.slice(1)}
            </Badge>
            <Badge variant={statusVariant(referral.status)}>
              {referral.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Parties */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-1">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>Referred by: <span className="text-foreground">{referrerName}</span></span>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            {formatDate(referral.createdAt)}
          </div>
        </div>

        <Separator />

        {/* Description */}
        {referral.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Description
            </p>
            <p className="text-sm">{referral.description}</p>
          </div>
        )}

        {/* Referrer Notes */}
        {referral.referrerNotes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Referrer Notes
            </p>
            <p className="text-sm">{referral.referrerNotes}</p>
          </div>
        )}

        {/* Counselor Notes */}
        {referral.counselorNotes && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Counselor Notes
              </p>
              <p className="text-sm">{referral.counselorNotes}</p>
            </div>
          </>
        )}

        {/* Outcome */}
        {referral.outcome && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Outcome
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant={outcomeVariant(referral.outcome)}>
                  {outcomeLabel(referral.outcome)}
                </Badge>
                {referral.resolutionNotes && (
                  <p className="text-sm text-muted-foreground">{referral.resolutionNotes}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Timeline */}
        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Timeline
          </p>
          <ol className="relative border-l border-muted ml-2 space-y-3">
            {timeline.map((event, i) => (
              <li key={i} className="pl-4">
                <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-muted ring-2 ring-background">
                  {event.icon}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                  <span className="text-sm font-medium">{event.label}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        {(canAcknowledge || canResolve) && (
          <>
            <Separator />
            <div className="flex flex-col sm:flex-row gap-2">
              {canAcknowledge && onAcknowledge && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onAcknowledge(referral.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Acknowledge
                </Button>
              )}
              {canResolve && onResolve && (
                <Button className="flex-1" onClick={() => onResolve(referral.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
