'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { NoticeBoardFeed } from '@/components/notice-board/NoticeBoardFeed';
import { useNoticeBoardFeed } from '@/hooks/useNoticeBoard';

export default function StudentNoticeBoardPage() {
  const { posts, loading } = useNoticeBoardFeed();

  return (
    <div className="space-y-6">
      <PageHeader title="Notice board" description="Notices from your teachers, your grade and the school." />
      <NoticeBoardFeed posts={posts} loading={loading} />
    </div>
  );
}
