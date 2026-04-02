import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  NoticeBoardPost,
  CreateNoticeBoardPostInput,
  UpdateNoticeBoardPostInput,
} from '@/types';

function extractArray(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}

function mapPost(raw: Record<string, unknown>): NoticeBoardPost {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    schoolId: (raw.schoolId as string) ?? '',
    scope: (raw.scope as NoticeBoardPost['scope']) ?? 'school',
    scopeId: (raw.scopeId as string) ?? '',
    authorId: (raw.authorId as string) ?? '',
    authorName: (raw.authorName as string) ?? '',
    authorRole: (raw.authorRole as string) ?? '',
    title: (raw.title as string) ?? '',
    content: (raw.content as string) ?? '',
    pinned: (raw.pinned as boolean) ?? false,
    attachments: Array.isArray(raw.attachments) ? raw.attachments as NoticeBoardPost['attachments'] : [],
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
  };
}

// ─── Feed hook (for parents and all roles) ─────────────────────────────────

export function useNoticeBoardFeed() {
  const user = useAuthStore((s) => s.user);
  const [posts, setPosts] = useState<NoticeBoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFeed = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/notice-board/my-feed', { params: { page: p } });
      const raw = unwrapResponse(res);
      const arr = extractArray(raw);
      setPosts(arr.map(mapPost));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        setTotal((obj.total as number) ?? arr.length);
        setPage((obj.page as number) ?? p);
        setTotalPages((obj.totalPages as number) ?? 1);
      }
    } catch {
      console.error('Failed to load notice board feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  return { posts, loading, total, page, totalPages, fetchFeed, setPage };
}

// ─── Scoped list hook (for teacher board management) ───────────────────────

export function useNoticeBoardPosts(scope: string, scopeId: string) {
  const [posts, setPosts] = useState<NoticeBoardPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!scope || !scopeId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/notice-board', { params: { scope, scopeId } });
      const raw = unwrapResponse(res);
      setPosts(extractArray(raw).map(mapPost));
    } catch {
      console.error('Failed to load notice board posts');
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return { posts, loading, fetchPosts };
}

// ─── Mutations hook ────────────────────────────────────────────────────────

export function useNoticeBoardMutations() {
  const user = useAuthStore((s) => s.user);

  const createPost = async (data: CreateNoticeBoardPostInput) => {
    const res = await apiClient.post('/notice-board', {
      ...data,
      _authorName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '',
    });
    return mapPost(unwrapResponse(res) as Record<string, unknown>);
  };

  const updatePost = async (id: string, data: UpdateNoticeBoardPostInput) => {
    const res = await apiClient.put(`/notice-board/${id}`, data);
    return mapPost(unwrapResponse(res) as Record<string, unknown>);
  };

  const deletePost = async (id: string) => {
    await apiClient.delete(`/notice-board/${id}`);
  };

  const togglePin = async (id: string) => {
    const res = await apiClient.patch(`/notice-board/${id}/pin`);
    return mapPost(unwrapResponse(res) as Record<string, unknown>);
  };

  return { createPost, updatePost, deletePost, togglePin };
}
