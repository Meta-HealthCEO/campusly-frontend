import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type {
  NewsArticle,
  CreateArticlePayload,
  UpdateArticlePayload,
  GenerateArticlePayload,
} from '@/types';

function extractArray(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}

function mapArticle(raw: Record<string, unknown>): NewsArticle {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    schoolId: (raw.schoolId as string) ?? '',
    title: (raw.title as string) ?? '',
    content: (raw.content as string) ?? '',
    excerpt: (raw.excerpt as string) ?? '',
    category: (raw.category as NewsArticle['category']) ?? 'general',
    coverImage: raw.coverImage as string | undefined,
    authorId: (raw.authorId as string) ?? '',
    authorName: (raw.authorName as string) ?? '',
    sourceType: (raw.sourceType as NewsArticle['sourceType']) ?? 'manual',
    status: (raw.status as NewsArticle['status']) ?? 'draft',
    publishedAt: raw.publishedAt as string | undefined,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    featured: (raw.featured as boolean) ?? false,
    viewCount: (raw.viewCount as number) ?? 0,
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
  };
}

// ─── Admin list hook (all statuses) ────────────────────────────────────────

export function useSchoolNewsAdmin(filters?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchArticles = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: p };
      if (filters?.category && filters.category !== 'all') params.category = filters.category;
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.search) params.search = filters.search;

      const res = await apiClient.get('/school-news', { params });
      const raw = unwrapResponse(res);
      const arr = extractArray(raw);
      setArticles(arr.map(mapArticle));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        setTotal((obj.total as number) ?? arr.length);
        setPage((obj.page as number) ?? p);
        setTotalPages((obj.totalPages as number) ?? 1);
      }
    } catch {
      console.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [filters?.category, filters?.status, filters?.search]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  return { articles, loading, total, page, totalPages, fetchArticles, setPage };
}

// ─── News Feed hook (published only) ──────────────────────────────────────

export function useNewsFeed(category?: string, limit?: number) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFeed = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: p };
      if (category && category !== 'all') params.category = category;
      if (limit) params.limit = limit;

      const res = await apiClient.get('/school-news/feed', { params });
      const raw = unwrapResponse(res);
      const arr = extractArray(raw);
      setArticles(arr.map(mapArticle));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        setTotal((obj.total as number) ?? arr.length);
        setPage((obj.page as number) ?? p);
        setTotalPages((obj.totalPages as number) ?? 1);
      }
    } catch {
      console.error('Failed to load news feed');
    } finally {
      setLoading(false);
    }
  }, [category, limit]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  return { articles, loading, total, page, totalPages, fetchFeed, setPage };
}

// ─── Featured articles hook ───────────────────────────────────────────────

export function useFeaturedArticles(limit = 3) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatured = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/school-news/featured', { params: { limit } });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw)
        ? (raw as Record<string, unknown>[])
        : extractArray(raw);
      setArticles(arr.map(mapArticle));
    } catch {
      console.error('Failed to load featured articles');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetchFeatured(); }, [fetchFeatured]);

  return { articles, loading, fetchFeatured };
}

// ─── Single article hook ──────────────────────────────────────────────────

export function useNewsArticle(id: string) {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/school-news/${id}`);
        const raw = unwrapResponse(res) as Record<string, unknown>;
        setArticle(mapArticle(raw));
      } catch {
        console.error('Failed to load article');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return { article, loading };
}

// ─── Mutations hook ───────────────────────────────────────────────────────

export function useSchoolNewsMutations() {
  const createArticle = async (data: CreateArticlePayload) => {
    const res = await apiClient.post('/school-news', data);
    return mapArticle(unwrapResponse(res) as Record<string, unknown>);
  };

  const generateArticle = async (data: GenerateArticlePayload) => {
    const res = await apiClient.post('/school-news/generate', data);
    return mapArticle(unwrapResponse(res) as Record<string, unknown>);
  };

  const updateArticle = async (id: string, data: UpdateArticlePayload) => {
    const res = await apiClient.put(`/school-news/${id}`, data);
    return mapArticle(unwrapResponse(res) as Record<string, unknown>);
  };

  const publishArticle = async (id: string) => {
    const res = await apiClient.patch(`/school-news/${id}/publish`);
    return mapArticle(unwrapResponse(res) as Record<string, unknown>);
  };

  const archiveArticle = async (id: string) => {
    const res = await apiClient.patch(`/school-news/${id}/archive`);
    return mapArticle(unwrapResponse(res) as Record<string, unknown>);
  };

  const deleteArticle = async (id: string) => {
    await apiClient.delete(`/school-news/${id}`);
  };

  return { createArticle, generateArticle, updateArticle, publishArticle, archiveArticle, deleteArticle };
}
