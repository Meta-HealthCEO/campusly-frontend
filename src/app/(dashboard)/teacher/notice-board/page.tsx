'use client';

import { useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { NoticeBoardFeed } from '@/components/notice-board/NoticeBoardFeed';
import { CreatePostDialog } from '@/components/notice-board/CreatePostDialog';
import { useNoticeBoardFeed, useNoticeBoardMutations } from '@/hooks/useNoticeBoard';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useAuthStore } from '@/stores/useAuthStore';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { NoticeBoardPost, CreateNoticeBoardPostInput, PostScope } from '@/types';

export default function TeacherNoticeBoardPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const { posts, loading, fetchFeed } = useNoticeBoardFeed();
  const { createPost, updatePost, deletePost, togglePin } = useNoticeBoardMutations();
  const { classes } = useTeacherClasses();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPost, setEditPost] = useState<NoticeBoardPost | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NoticeBoardPost | null>(null);

  const scopeOptions = useMemo(() => {
    const options: Array<{ id: string; name: string; scope: PostScope }> = [];
    if (schoolId) options.push({ id: schoolId, name: 'School-wide', scope: 'school' });
    classes.forEach((c) => {
      const classId = c.id ?? '';
      options.push({ id: classId, name: `Class: ${c.name}`, scope: 'class' });
    });
    return options;
  }, [schoolId, classes]);

  const handleCreate = useCallback(async (data: CreateNoticeBoardPostInput) => {
    try {
      await createPost(data);
      toast.success('Notice posted');
      fetchFeed();
    } catch {
      toast.error('Failed to create post');
    }
  }, [createPost, fetchFeed]);

  const handleUpdate = useCallback(async (id: string, data: { title?: string; content?: string; pinned?: boolean }) => {
    try {
      await updatePost(id, data);
      toast.success('Post updated');
      fetchFeed();
    } catch {
      toast.error('Failed to update post');
    }
  }, [updatePost, fetchFeed]);

  const requestDelete = useCallback((post: NoticeBoardPost) => {
    setPendingDelete(post);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await deletePost(pendingDelete.id);
      toast.success('Post deleted');
      fetchFeed();
    } catch (err) {
      toast.error('Failed to delete post');
      throw err; // keep dialog open
    }
  }, [deletePost, fetchFeed, pendingDelete]);

  const handleTogglePin = useCallback(async (post: NoticeBoardPost) => {
    try {
      await togglePin(post.id);
      toast.success(post.pinned ? 'Post unpinned' : 'Post pinned');
      fetchFeed();
    } catch {
      toast.error('Failed to toggle pin');
    }
  }, [togglePin, fetchFeed]);

  const handleEdit = useCallback((post: NoticeBoardPost) => {
    setEditPost(post);
    setDialogOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Notice Board" description="Post notices to your classes or school-wide.">
        <Button onClick={() => { setEditPost(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Notice
        </Button>
      </PageHeader>

      <NoticeBoardFeed
        posts={posts}
        loading={loading}
        canManage
        onEdit={handleEdit}
        onDelete={requestDelete}
        onTogglePin={handleTogglePin}
      />

      <CreatePostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        editPost={editPost}
        onUpdate={handleUpdate}
        scopeOptions={scopeOptions}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => { if (!v) setPendingDelete(null); }}
        title="Delete notice"
        description={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.title}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
