'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

// ---------- API types (backend-aligned) ----------

export interface ApiAchievement {
  _id: string;
  studentId: string | PopulatedStudent;
  schoolId: string;
  type: 'academic' | 'sport' | 'cultural' | 'behaviour';
  title: string;
  description?: string;
  term: number;
  year: number;
  category?: string;
  points: number;
  awardedBy: string | PopulatedUser;
  awardedAt: string;
  isPublic: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PopulatedUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PopulatedStudent {
  _id: string;
  userId: string;
  admissionNumber?: string;
  firstName?: string;
  lastName?: string;
  user?: PopulatedUser;
  gradeId?: string;
  classId?: string;
}

export interface ApiHousePoints {
  _id: string;
  schoolId: string;
  houseName: string;
  houseColor: string;
  totalPoints: number;
  term: number;
  year: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiHousePointLog {
  _id: string;
  studentId: string | PopulatedStudent;
  houseId: string;
  points: number;
  reason: string;
  awardedBy: string | PopulatedUser;
  isDeleted: boolean;
  createdAt: string;
}

export interface WallOfFameEntry {
  _id: string;
  totalPoints: number;
  achievementCount: number;
  student: PopulatedStudent;
}

export interface WallOfFameData {
  academic: WallOfFameEntry[];
  sport: WallOfFameEntry[];
  cultural: WallOfFameEntry[];
  behaviour: WallOfFameEntry[];
}

export interface TopMarkEntry {
  _id: string;
  averagePercentage: number;
  totalMarks: number;
  student: PopulatedStudent;
}

// ---------- Input types ----------

export interface CreateAchievementInput {
  studentId: string;
  schoolId: string;
  type: 'academic' | 'sport' | 'cultural' | 'behaviour';
  title: string;
  description?: string;
  term: number;
  year: number;
  category?: string;
  points?: number;
  awardedBy: string;
  awardedAt?: string;
  isPublic?: boolean;
}

export interface CreateHouseInput {
  schoolId: string;
  houseName: string;
  houseColor: string;
  term: number;
  year: number;
}

export interface AwardHousePointsInput {
  studentId: string;
  houseId: string;
  points: number;
  reason: string;
}

// ---------- Unwrap helpers ----------

function unwrapArray<T>(res: { data: unknown }): T[] {
  const raw = (res.data as Record<string, unknown>).data ?? res.data;
  if (Array.isArray(raw)) return raw as T[];
  const inner = (raw as Record<string, unknown>).data;
  return Array.isArray(inner) ? (inner as T[]) : [];
}

function unwrapObject<T>(res: { data: unknown }): T {
  const raw = (res.data as Record<string, unknown>).data ?? res.data;
  return raw as T;
}

function unwrapPaginated<T>(res: { data: unknown }): { items: T[]; total: number } {
  const outer = (res.data as Record<string, unknown>).data ?? res.data;
  const obj = outer as Record<string, unknown>;
  const items = Array.isArray(obj.data) ? (obj.data as T[]) : Array.isArray(obj) ? (obj as T[]) : [];
  const total = typeof obj.total === 'number' ? obj.total : items.length;
  return { items, total };
}

// ---------- Hook ----------

export function useAchiever() {
  const [loading, setLoading] = useState(false);

  const fetchAchievements = useCallback(async (params?: Record<string, string | number>) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/achiever/achievements', { params });
      const result = unwrapPaginated<ApiAchievement>(res);
      return result;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load achievements';
      toast.error(msg);
      return { items: [] as ApiAchievement[], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const createAchievement = useCallback(async (data: CreateAchievementInput) => {
    const res = await apiClient.post('/achiever/achievements', data);
    return unwrapObject<ApiAchievement>(res);
  }, []);

  const updateAchievement = useCallback(async (id: string, data: Partial<CreateAchievementInput>) => {
    const res = await apiClient.put(`/achiever/achievements/${id}`, data);
    return unwrapObject<ApiAchievement>(res);
  }, []);

  const deleteAchievement = useCallback(async (id: string) => {
    await apiClient.delete(`/achiever/achievements/${id}`);
  }, []);

  const fetchWallOfFame = useCallback(async (params?: Record<string, string | number>) => {
    const res = await apiClient.get('/achiever/achievements/wall-of-fame', { params });
    return unwrapObject<WallOfFameData>(res);
  }, []);

  const fetchTopMarks = useCallback(async (params: { term: number; academicYear: number }) => {
    const res = await apiClient.get('/achiever/achievements/top-marks', { params });
    return unwrapArray<TopMarkEntry>(res);
  }, []);

  const fetchHouses = useCallback(async (params?: Record<string, string | number>) => {
    const res = await apiClient.get('/achiever/houses', { params });
    return unwrapArray<ApiHousePoints>(res);
  }, []);

  const fetchLeaderboard = useCallback(async (params?: Record<string, string | number>) => {
    const res = await apiClient.get('/achiever/houses/leaderboard', { params });
    return unwrapArray<ApiHousePoints>(res);
  }, []);

  const createHouse = useCallback(async (data: CreateHouseInput) => {
    const res = await apiClient.post('/achiever/houses', data);
    return unwrapObject<ApiHousePoints>(res);
  }, []);

  const updateHouse = useCallback(async (id: string, data: Partial<CreateHouseInput>) => {
    const res = await apiClient.put(`/achiever/houses/${id}`, data);
    return unwrapObject<ApiHousePoints>(res);
  }, []);

  const awardHousePoints = useCallback(async (data: AwardHousePointsInput) => {
    const res = await apiClient.post('/achiever/houses/points', data);
    return unwrapObject<ApiHousePointLog>(res);
  }, []);

  const fetchHouseHistory = useCallback(async (houseId: string, page = 1, limit = 20) => {
    const res = await apiClient.get(`/achiever/houses/${houseId}/history`, { params: { page, limit } });
    return unwrapPaginated<ApiHousePointLog>(res);
  }, []);

  return {
    loading,
    fetchAchievements,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    fetchWallOfFame,
    fetchTopMarks,
    fetchHouses,
    fetchLeaderboard,
    createHouse,
    updateHouse,
    awardHousePoints,
    fetchHouseHistory,
  };
}
