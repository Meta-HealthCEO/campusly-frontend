'use client';

import { Badge } from '@/components/ui/badge';
import type { AdmissionStatus } from '@/types/admissions';

const STATUS_CONFIG: Record<AdmissionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  submitted: { label: 'Submitted', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'default' },
  interview_scheduled: { label: 'Interview Scheduled', variant: 'outline' },
  accepted: { label: 'Accepted', variant: 'default' },
  waitlisted: { label: 'Waitlisted', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

interface Props {
  status: AdmissionStatus;
  className?: string;
}

export function ApplicationStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
