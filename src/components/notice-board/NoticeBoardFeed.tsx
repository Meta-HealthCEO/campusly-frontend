'use client';

import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PostCard } from './PostCard';
import { Clipboard } from 'lucide-react';
import type { NoticeBoardPost } from '@/types';

interface NoticeBoardFeedProps {
  posts: NoticeBoardPost[];
  loading: boolean;
  canManage?: boolean;
  onEdit?: (post: NoticeBoardPost) => void;
  onDelete?: (post: NoticeBoardPost) => void;
  onTogglePin?: (post: NoticeBoardPost) => void;
}

export function NoticeBoardFeed({
  posts, loading, canManage, onEdit, onDelete, onTogglePin,
}: NoticeBoardFeedProps) {
  if (loading) return <LoadingSpinner />;

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={Clipboard}
        title="No notices yet"
        description="There are no notices posted to this board yet."
      />
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
}
