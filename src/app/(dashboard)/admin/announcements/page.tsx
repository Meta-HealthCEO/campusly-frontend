'use client';

import { useState, useCallback } from 'react';
import {
  Plus, Megaphone, Pin, CalendarClock, Eye, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { AnnouncementDetail } from '@/components/announcements/AnnouncementDetail';
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  useAnnouncements,
  useAnnouncementCrud,
} from '@/hooks/useAnnouncements';
import type {
  Announcement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@/hooks/useAnnouncements';

export default function AnnouncementsPage() {
  const { announcements, loading, refetch } = useAnnouncements();
  const {
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement,
  } = useAnnouncementCrud();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ============== Stats ==============
  const total = announcements.length;
  const pinned = announcements.filter((a) => a.pinned).length;
  const scheduled = announcements.filter(
    (a) => a.scheduledPublishDate && !a.isPublished,
  ).length;
  const published = announcements.filter((a) => a.isPublished);
  const avgReadRate =
    published.length > 0
      ? Math.round(
          published.reduce((sum, a) => sum + a.readBy.length, 0) /
            published.length,
        )
      : 0;

  // ============== Handlers ==============
  const handleCreate = useCallback(
    async (data: Omit<CreateAnnouncementInput, 'schoolId'>) => {
      try {
        setSubmitting(true);
        await createAnnouncement(data);
        toast.success('Announcement created!');
        setCreateOpen(false);
        await refetch();
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create announcement';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [createAnnouncement, refetch],
  );

  const handleEdit = useCallback(
    async (data: Omit<CreateAnnouncementInput, 'schoolId'>) => {
      if (!selected) return;
      try {
        setSubmitting(true);
        const payload: UpdateAnnouncementInput = {
          title: data.title,
          content: data.content,
          targetAudience: data.targetAudience,
          targetId: data.targetId,
          attachments: data.attachments,
          priority: data.priority,
          expiresAt: data.expiresAt,
        };
        await updateAnnouncement(selected.id, payload);
        toast.success('Announcement updated!');
        setEditOpen(false);
        setSelected(null);
        await refetch();
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update announcement';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [selected, updateAnnouncement, refetch],
  );

  const handlePublish = useCallback(
    async (id: string) => {
      try {
        await publishAnnouncement(id);
        toast.success('Announcement published!');
        await refetch();
        if (selected?.id === id) {
          const updated = announcements.find((a) => a.id === id);
          if (updated) setSelected({ ...updated, isPublished: true });
        }
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to publish announcement';
        toast.error(msg);
      }
    },
    [publishAnnouncement, refetch, selected, announcements],
  );

  const handleUnpublish = useCallback(
    async (id: string) => {
      try {
        await unpublishAnnouncement(id);
        toast.success('Announcement unpublished');
        await refetch();
        if (selected?.id === id) {
          const updated = announcements.find((a) => a.id === id);
          if (updated) setSelected({ ...updated, isPublished: false });
        }
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to unpublish announcement';
        toast.error(msg);
      }
    },
    [unpublishAnnouncement, refetch, selected, announcements],
  );

  const confirmDelete = useCallback(
    async () => {
      if (!deleteTarget) return;
      try {
        await deleteAnnouncement(deleteTarget);
        toast.success('Announcement deleted');
        if (selected?.id === deleteTarget) setSelected(null);
        await refetch();
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete announcement';
        toast.error(msg);
      } finally {
        setDeleteTarget(null);
        setDeleteOpen(false);
      }
    },
    [deleteTarget, deleteAnnouncement, refetch, selected],
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Create and manage school-wide announcements.">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> New Announcement
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Compose a new announcement for students, parents, or staff.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <AnnouncementForm
                onSubmit={handleCreate}
                isLoading={submitting}
                mode="create"
              />
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Announcements" value={String(total)} icon={Megaphone} description="All time" />
        <StatCard title="Pinned" value={String(pinned)} icon={Pin} description="Shown at top" />
        <StatCard title="Scheduled" value={String(scheduled)} icon={CalendarClock} description="Pending publish" />
        <StatCard title="Avg Reads" value={String(avgReadRate)} icon={Eye} description="Per published" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnnouncementList
            announcements={announcements}
            onView={setSelected}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={(id) => { setDeleteTarget(id); setDeleteOpen(true); }}
          />
        </div>
        <div>
          {selected ? (
            <AnnouncementDetail
              announcement={selected}
              onEdit={() => setEditOpen(true)}
              onDelete={() => { setDeleteTarget(selected.id); setDeleteOpen(true); }}
              onPublish={() => handlePublish(selected.id)}
              onUnpublish={() => handleUnpublish(selected.id)}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click &quot;View&quot; on any announcement to see details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update this announcement.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {selected && (
              <AnnouncementForm
                defaultValues={{
                  title: selected.title,
                  content: selected.content,
                  targetAudience: selected.targetAudience,
                  targetId: selected.targetId ?? undefined,
                  attachments: selected.attachments,
                  priority: selected.priority,
                  expiresAt: selected.expiresAt ?? undefined,
                  pinned: selected.pinned,
                }}
                onSubmit={handleEdit}
                isLoading={submitting}
                mode="edit"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
