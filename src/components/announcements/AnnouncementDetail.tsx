'use client';

import { Star, Edit, Trash2, Send, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnnouncementPriorityBadge } from './AnnouncementPriorityBadge';
import { AnnouncementStatusBadge } from './AnnouncementStatusBadge';
import { formatDate } from '@/lib/utils';
import type { Announcement, AnnouncementAuthor } from '@/hooks/useAnnouncements';

interface AnnouncementDetailProps {
  announcement: Announcement;
  onEdit?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
}

function getAuthorName(authorId: AnnouncementAuthor | string): string {
  if (typeof authorId === 'string') return 'Unknown';
  return `${authorId.firstName} ${authorId.lastName}`;
}

const audienceLabels: Record<string, string> = {
  all: 'Whole School',
  teachers: 'Teachers',
  parents: 'Parents',
  students: 'Students',
  grade: 'Specific Grade',
  class: 'Specific Class',
};

export function AnnouncementDetail({
  announcement,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
}: AnnouncementDetailProps) {
  const readCount = announcement.readBy.length;
  const dateStr = announcement.publishedAt ?? announcement.createdAt;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {announcement.pinned && (
            <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
          )}
          <CardTitle className="text-base">{announcement.title}</CardTitle>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span>By {getAuthorName(announcement.authorId)}</span>
          <span>&middot;</span>
          <span>{dateStr ? formatDate(dateStr) : 'Not published'}</span>
          <span>&middot;</span>
          <AnnouncementPriorityBadge priority={announcement.priority} />
          <AnnouncementStatusBadge
            isPublished={announcement.isPublished}
            scheduledPublishDate={announcement.scheduledPublishDate}
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground">
          Audience: {audienceLabels[announcement.targetAudience] ?? announcement.targetAudience}
        </div>

        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {announcement.content}
        </p>

        {announcement.attachments.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Attachments</p>
            {announcement.attachments.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-primary hover:underline truncate"
              >
                {url}
              </a>
            ))}
          </div>
        )}

        {readCount > 0 && (
          <div className="flex gap-6 rounded-lg border p-3">
            <div>
              <p className="text-xs text-muted-foreground">Read by</p>
              <p className="text-lg font-bold">{readCount}</p>
            </div>
          </div>
        )}

        {announcement.expiresAt && (
          <p className="text-xs text-muted-foreground">
            Expires: {formatDate(announcement.expiresAt)}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit className="mr-1 h-3 w-3" /> Edit
            </Button>
          )}
          {onPublish && !announcement.isPublished && (
            <Button size="sm" onClick={onPublish}>
              <Send className="mr-1 h-3 w-3" /> Publish
            </Button>
          )}
          {onUnpublish && announcement.isPublished && (
            <Button size="sm" variant="outline" onClick={onUnpublish}>
              <EyeOff className="mr-1 h-3 w-3" /> Unpublish
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
