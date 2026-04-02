'use client';

import { Star, AlertTriangle, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useActiveAnnouncements } from '@/hooks/useAnnouncements';
import { formatRelativeDate } from '@/lib/utils';
import type { AnnouncementPriority } from '@/hooks/useAnnouncements';

interface AnnouncementBannerProps {
  limit?: number;
  showPinnedOnly?: boolean;
}

const priorityAccent: Record<AnnouncementPriority, string> = {
  low: 'border-l-slate-300',
  medium: 'border-l-slate-400',
  high: 'border-l-amber-500',
  urgent: 'border-l-red-500',
};

export function AnnouncementBanner({
  limit = 5,
  showPinnedOnly = false,
}: AnnouncementBannerProps) {
  const { announcements, loading } = useActiveAnnouncements(limit);

  const filtered = showPinnedOnly
    ? announcements.filter((a) => a.pinned)
    : announcements;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No announcements right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> Announcements
          <Badge variant="secondary" className="ml-auto text-xs">
            {filtered.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.map((a) => (
          <div
            key={a.id}
            className={`rounded-lg border border-l-4 p-3 ${priorityAccent[a.priority] ?? 'border-l-slate-300'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {a.priority === 'urgent' && (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
                {a.pinned && (
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                )}
                <p className="text-sm font-medium truncate">{a.title}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {a.publishedAt
                  ? formatRelativeDate(a.publishedAt)
                  : formatRelativeDate(a.createdAt)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {a.content}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
