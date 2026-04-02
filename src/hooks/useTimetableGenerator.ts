import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { TimetableGeneration, LockedSlot } from '@/types';

export function useTimetableGenerator() {
  const [generation, setGeneration] = useState<TimetableGeneration | null>(null);
  const [generating, setGenerating] = useState(false);

  const pollGeneration = useCallback(async (id: string): Promise<TimetableGeneration | null> => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const res = await apiClient.get(`/timetable-builder/generation/${id}`);
        const gen = unwrapResponse<TimetableGeneration>(res);
        setGeneration(gen);
        if (gen.status === 'completed' || gen.status === 'failed') {
          setGenerating(false);
          return gen;
        }
      } catch {
        console.error('Poll failed, retrying...');
      }
    }
    setGenerating(false);
    toast.error('Generation timed out');
    return null;
  }, []);

  const generate = useCallback(
    async (gradeId?: string, lockedSlots?: LockedSlot[]) => {
      try {
        setGenerating(true);
        const res = await apiClient.post('/timetable-builder/generate', {
          gradeId,
          lockedSlots,
        });
        const gen = unwrapResponse<TimetableGeneration>(res);
        setGeneration(gen);

        if (gen.status === 'generating' && gen.id) {
          await pollGeneration(gen.id);
        }
        return gen;
      } catch (err: unknown) {
        toast.error('Failed to start timetable generation');
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [pollGeneration],
  );

  const loadGeneration = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/timetable-builder/generation/${id}`);
      const gen = unwrapResponse<TimetableGeneration>(res);
      setGeneration(gen);
      return gen;
    } catch {
      console.error('Failed to load generation');
      return null;
    }
  }, []);

  const commitGeneration = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/timetable-builder/generation/${id}/commit`);
      toast.success('Timetable committed successfully!');
    } catch (err: unknown) {
      toast.error('Failed to commit timetable');
      throw err;
    }
  }, []);

  return {
    generation,
    generating,
    generate,
    loadGeneration,
    commitGeneration,
  };
}
