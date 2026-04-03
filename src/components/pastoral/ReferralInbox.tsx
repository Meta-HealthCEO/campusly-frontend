'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import type { PastoralReferral, ReferralReason, ReferralUrgency, PastoralReferralStatus } from '@/types';

interface Props {
  referrals: PastoralReferral[];
  onView: (referral: PastoralReferral) => void;
}

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

function UrgencyBadge({ urgency }: { urgency: ReferralUrgency }) {
  const styles: Record<ReferralUrgency, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-destructive/10 text-destructive',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[urgency]}`}>
      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </span>
  );
}

function ReferralStatusBadge({ status }: { status: PastoralReferralStatus }) {
  const map: Record<PastoralReferralStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    referred: { label: 'Referred', variant: 'secondary' },
    acknowledged: { label: 'Acknowledged', variant: 'outline' },
    in_progress: { label: 'In Progress', variant: 'default' },
    resolved: { label: 'Resolved', variant: 'outline' },
    closed: { label: 'Closed', variant: 'secondary' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ReferralInbox({ referrals, onView }: Props) {
  const columns = useMemo<ColumnDef<PastoralReferral>[]>(() => [
    {
      accessorKey: 'studentId',
      header: 'Student',
      cell: ({ row }) => {
        const s = row.original.studentId;
        return <span className="font-medium truncate">{s.firstName} {s.lastName}</span>;
      },
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => (
        <Badge variant="outline">{REASON_LABELS[row.original.reason]}</Badge>
      ),
    },
    {
      accessorKey: 'urgency',
      header: 'Urgency',
      cell: ({ row }) => <UrgencyBadge urgency={row.original.urgency} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ReferralStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'referredBy',
      header: 'Referred By',
      cell: ({ row }) => {
        const r = row.original.referredBy;
        return <span className="truncate">{r.firstName} {r.lastName}</span>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => onView(row.original)}>
          View
        </Button>
      ),
    },
  ], [onView]);

  return (
    <DataTable
      columns={columns}
      data={referrals}
      searchKey="studentId"
      searchPlaceholder="Search referrals..."
    />
  );
}
