'use client';

import { Badge } from '@/components/ui/badge';

type DerivedStatus = 'published' | 'scheduled' | 'draft';

const statusConfig: Record<DerivedStatus, { label: string; className: string }> = {
  published: { label: 'Published', className: 'bg-emerald-100 text-emerald-800' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-500' },
};

interface AnnouncementStatusBadgeProps {
  isPublished: boolean;
  scheduledPublishDate: string | null;
}

export function deriveStatus(
  isPublished: boolean,
  scheduledPublishDate: string | null,
): DerivedStatus {
  if (isPublished) return 'published';
  if (scheduledPublishDate && !isPublished) return 'scheduled';
  return 'draft';
}

export function AnnouncementStatusBadge({
  isPublished,
  scheduledPublishDate,
}: AnnouncementStatusBadgeProps) {
  const status = deriveStatus(isPublished, scheduledPublishDate);
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
