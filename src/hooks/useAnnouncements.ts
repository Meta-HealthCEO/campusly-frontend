import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

// ============== Types ==============

export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AnnouncementAudience = 'all' | 'teachers' | 'parents' | 'students' | 'grade' | 'class';

export interface AnnouncementAuthor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  schoolId: string;
  authorId: AnnouncementAuthor | string;
  targetAudience: AnnouncementAudience;
  targetId: string | null;
  attachments: string[];
  priority: AnnouncementPriority;
  isPublished: boolean;
  pinned: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  scheduledPublishDate: string | null;
  readBy: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  schoolId: string;
  targetAudience: AnnouncementAudience;
  targetId?: string;
  attachments?: string[];
  priority?: AnnouncementPriority;
  expiresAt?: string;
  pinned?: boolean;
  scheduledPublishDate?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  targetAudience?: AnnouncementAudience;
  targetId?: string;
  attachments?: string[];
  priority?: AnnouncementPriority;
  expiresAt?: string;
}

// ============== Mappers ==============

function mapAnnouncement(raw: Record<string, unknown>): Announcement {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    title: (raw.title as string) ?? '',
    content: (raw.content as string) ?? '',
    schoolId: (raw.schoolId as string) ?? '',
    authorId: raw.authorId as AnnouncementAuthor | string,
    targetAudience: (raw.targetAudience as AnnouncementAudience) ?? 'all',
    targetId: (raw.targetId as string) ?? null,
    attachments: (raw.attachments as string[]) ?? [],
    priority: (raw.priority as AnnouncementPriority) ?? 'medium',
    isPublished: (raw.isPublished as boolean) ?? false,
    pinned: (raw.pinned as boolean) ?? false,
    publishedAt: (raw.publishedAt as string) ?? null,
    expiresAt: (raw.expiresAt as string) ?? null,
    scheduledPublishDate: (raw.scheduledPublishDate as string) ?? null,
    readBy: (raw.readBy as string[]) ?? [],
    isDeleted: (raw.isDeleted as boolean) ?? false,
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
  };
}

function extractAnnouncements(data: unknown): Announcement[] {
  const raw = data as Record<string, unknown>;
  const list = raw.announcements ?? raw.data;
  if (Array.isArray(list)) {
    return (list as Record<string, unknown>[]).map(mapAnnouncement);
  }
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[]).map(mapAnnouncement);
  }
  return [];
}

// ============== useAnnouncements (admin list) ==============

export function useAnnouncements() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/announcements', {
        params: { schoolId, limit: 100, sort: '-createdAt' },
      });
      const raw = res.data.data ?? res.data;
      const items = extractAnnouncements(raw);
      setAnnouncements(items);
      setTotal(
        typeof (raw as Record<string, unknown>).total === 'number'
          ? (raw as Record<string, unknown>).total as number
          : items.length
      );
    } catch {
      console.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) fetchAnnouncements();
  }, [schoolId, fetchAnnouncements]);

  return { announcements, total, loading, refetch: fetchAnnouncements };
}

// ============== useActiveAnnouncements (feed) ==============

export function useActiveAnnouncements(limit = 5) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActive = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/announcements/active', {
        params: { limit },
      });
      const raw = res.data.data ?? res.data;
      const items = extractAnnouncements(raw);
      // Sort pinned first, then by publishedAt descending
      items.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const aDate = a.publishedAt ?? a.createdAt;
        const bDate = b.publishedAt ?? b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      setAnnouncements(items);
    } catch {
      console.error('Failed to load active announcements');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  return { announcements, loading, refetch: fetchActive };
}

// ============== useAnnouncementCrud ==============

export function useAnnouncementCrud() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createAnnouncement = async (
    data: Omit<CreateAnnouncementInput, 'schoolId'>
  ): Promise<Announcement> => {
    const res = await apiClient.post('/announcements', { ...data, schoolId });
    const raw = res.data.data ?? res.data;
    return mapAnnouncement(raw as Record<string, unknown>);
  };

  const updateAnnouncement = async (
    id: string,
    data: UpdateAnnouncementInput
  ): Promise<Announcement> => {
    const res = await apiClient.put(`/announcements/${id}`, data);
    const raw = res.data.data ?? res.data;
    return mapAnnouncement(raw as Record<string, unknown>);
  };

  const deleteAnnouncement = async (id: string): Promise<void> => {
    await apiClient.delete(`/announcements/${id}`);
  };

  const publishAnnouncement = async (id: string): Promise<Announcement> => {
    const res = await apiClient.patch(`/announcements/${id}/publish`);
    const raw = res.data.data ?? res.data;
    return mapAnnouncement(raw as Record<string, unknown>);
  };

  const unpublishAnnouncement = async (id: string): Promise<Announcement> => {
    const res = await apiClient.patch(`/announcements/${id}/unpublish`);
    const raw = res.data.data ?? res.data;
    return mapAnnouncement(raw as Record<string, unknown>);
  };

  return {
    schoolId,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement,
  };
}
