'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, Trash2, Edit, Paperclip } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { NoticeBoardPost } from '@/types';

interface PostCardProps {
  post: NoticeBoardPost;
  canManage?: boolean;
  onEdit?: (post: NoticeBoardPost) => void;
  onDelete?: (post: NoticeBoardPost) => void;
  onTogglePin?: (post: NoticeBoardPost) => void;
}

const scopeLabels: Record<string, string> = {
  class: 'Class',
  grade: 'Grade',
  school: 'School-wide',
};

const roleLabels: Record<string, string> = {
  teacher: 'Teacher',
  school_admin: 'Admin',
  super_admin: 'Admin',
};

export function PostCard({ post, canManage, onEdit, onDelete, onTogglePin }: PostCardProps) {
  return (
    <Card className={post.pinned ? 'border-primary/40 bg-primary/5' : ''}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {post.pinned && (
                <Pin className="h-3.5 w-3.5 text-primary shrink-0 fill-primary" />
              )}
              <h3 className="font-semibold text-sm truncate">{post.title}</h3>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{post.authorName}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {roleLabels[post.authorRole] ?? post.authorRole}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {scopeLabels[post.scope] ?? post.scope}
              </Badge>
            </div>
          </div>
          {post.createdAt && (
            <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
              {formatDate(post.createdAt, 'dd MMM yyyy')}
            </span>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
          {post.content}
        </p>

        {/* Attachments indicator */}
        {post.attachments.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>{post.attachments.length} attachment{post.attachments.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Action buttons */}
        {canManage && (
          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onTogglePin?.(post)}
            >
              <Pin className={`h-3 w-3 mr-1 ${post.pinned ? 'fill-primary text-primary' : ''}`} />
              {post.pinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onEdit?.(post)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onDelete?.(post)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
