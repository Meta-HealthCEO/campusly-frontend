'use client';

import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RiskLevelBadge } from './RiskLevelBadge';
import { ReferralStatusBadge } from './ReferralStatusBadge';
import type { CounselorCaseload, ReferralReason } from '@/types';

type CaseItem = CounselorCaseload['cases'][number];

const REASON_LABELS: Record<ReferralReason, string> = {
  academic: 'Academic',
  behavioural: 'Behavioural',
  emotional: 'Emotional',
  social: 'Social',
  family: 'Family',
  substance: 'Substance',
  bullying: 'Bullying',
  self_harm: 'Self Harm',
  other: 'Other',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${m}/${y}`;
}

interface StudentCaseRowProps {
  caseItem: CaseItem;
  onClick?: () => void;
}

export function StudentCaseRow({ caseItem, onClick }: StudentCaseRowProps) {
  const { studentId, reason, status, sessionCount, lastSessionDate, nextFollowUp, isOverdue, riskLevel } = caseItem;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick();
      }}
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3 transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-medium truncate">
            {studentId.firstName} {studentId.lastName}
          </h4>
          <p className="text-sm text-muted-foreground">Grade {studentId.grade}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <Badge variant="outline">{REASON_LABELS[reason]}</Badge>
          <ReferralStatusBadge status={status} />
          <RiskLevelBadge level={riskLevel} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5 shrink-0" />
          <span>
            <span className="font-medium text-foreground">{sessionCount}</span>{' '}
            session{sessionCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span>Last: {formatDate(lastSessionDate)}</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5',
            isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
          )}
        >
          <Calendar className="size-3.5 shrink-0" />
          <span>
            Next:{' '}
            {nextFollowUp ? (
              <>
                {formatDate(nextFollowUp)}
                {isOverdue && ' (overdue)'}
              </>
            ) : (
              '—'
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
