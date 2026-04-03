'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Clock, Lock, User } from 'lucide-react';
import type { CounselorSession, PastoralSessionType, ConfidentialityLevel } from '@/types';

interface SessionDetailCardProps {
  session: CounselorSession;
}

function sessionTypeLabel(type: PastoralSessionType): string {
  const labels: Record<PastoralSessionType, string> = {
    individual: 'Individual',
    group: 'Group',
    crisis: 'Crisis',
    follow_up: 'Follow-up',
    consultation: 'Consultation',
  };
  return labels[type] ?? type;
}

function sessionTypeVariant(
  type: PastoralSessionType,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (type === 'crisis') return 'destructive';
  if (type === 'follow_up') return 'secondary';
  return 'default';
}

function confidentialityLabel(level: ConfidentialityLevel): string {
  const labels: Record<ConfidentialityLevel, string> = {
    standard: 'Standard',
    sensitive: 'Sensitive',
    restricted: 'Restricted',
  };
  return labels[level] ?? level;
}

function confidentialityVariant(
  level: ConfidentialityLevel,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (level === 'restricted') return 'destructive';
  if (level === 'sensitive') return 'secondary';
  return 'outline';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function SessionDetailCard({ session }: SessionDetailCardProps) {
  const studentName = `${session.studentId.firstName} ${session.studentId.lastName}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base truncate">{studentName}</CardTitle>
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>{formatDate(session.sessionDate)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={sessionTypeVariant(session.sessionType)}>
              {sessionTypeLabel(session.sessionType)}
            </Badge>
            <Badge variant={confidentialityVariant(session.confidentialityLevel)}>
              <Lock className="h-3 w-3 mr-1" />
              {confidentialityLabel(session.confidentialityLevel)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{session.duration} min</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>
              {session.counselorId.firstName} {session.counselorId.lastName}
            </span>
          </div>
        </div>

        {session.summary && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Session Summary
            </p>
            <p className="text-sm">{session.summary}</p>
          </div>
        )}

        {session.followUpActions && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Follow-up Actions
              </p>
              <p className="text-sm">{session.followUpActions}</p>
            </div>
          </>
        )}

        {session.followUpDate && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Follow-up due: {formatDate(session.followUpDate)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
