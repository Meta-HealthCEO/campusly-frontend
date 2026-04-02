'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { NoticeBoardFeed } from '@/components/notice-board/NoticeBoardFeed';
import { useNoticeBoardFeed } from '@/hooks/useNoticeBoard';

export default function ParentNoticeBoardPage() {
  const { posts, loading } = useNoticeBoardFeed();

  return (
    <div className="space-y-6">
      <PageHeader title="Notice Board" description="View notices from your children's classes and school." />
      <NoticeBoardFeed posts={posts} loading={loading} />
    </div>
  );
}
