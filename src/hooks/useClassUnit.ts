'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type { Course, ItemGenStatus } from '@/types/courses';
import type { PolledState } from '@/lib/course-unit';
import type { ContentBlockItem } from '@/types';

export interface CreateUnitInput {
  classId: string;
  subjectId: string;
  termNumber: number;
  topicNodeIds: string[];
  title?: string;
}

export type GenerationPoll = PolledState;

export interface PreviewQuestion {
  id: string;
  stem: string;
  type: string;
  marks: number;
  answer?: string;
  options: Array<{ label: string; text: string; isCorrect: boolean }>;
}

export type ItemPreview =
  | { kind: 'content'; title: string; blocks: ContentBlockItem[] }
  | { kind: 'quiz'; title: string; questions: PreviewQuestion[] }
  | { kind: 'not_ready'; title: string; genStatus: ItemGenStatus | null; genError: string };

export interface ReleaseResult {
  classes: Array<{ classId: string; name: string; newEnrolments: number }>;
}

/** Class units: create, outline with AI, approve, retry, preview and release. */
export function useClassUnit() {
  const createUnit = useCallback(async (input: CreateUnitInput): Promise<Course | null> => {
    try {
      return unwrapResponse<Course>(await apiClient.post('/courses/class-units', input));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not start the unit. Please try again.'));
      return null;
    }
  }, []);

  /** Returns null when drafted, or the reason it couldn't be (shown on the page). */
  const draftOutline = useCallback(async (courseId: string): Promise<string | null> => {
    try {
      await apiClient.post(`/courses/${courseId}/outline`);
      return null;
    } catch (err: unknown) {
      console.error('Outline draft failed', err);
      return extractErrorMessage(err, 'The AI could not draft the outline just now. Try again in a moment.');
    }
  }, []);

  const approveOutline = useCallback(async (courseId: string): Promise<boolean> => {
    try {
      await apiClient.post(`/courses/${courseId}/outline/approve`);
      toast.success('Outline approved. The items are being written.');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not approve the outline.'));
      return false;
    }
  }, []);

  const retryItem = useCallback(async (courseId: string, lessonId: string): Promise<boolean> => {
    try {
      await apiClient.post(`/courses/${courseId}/lessons/${lessonId}/generate`);
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not try that item again.'));
      return false;
    }
  }, []);

  const previewItem = useCallback(async (courseId: string, lessonId: string): Promise<ItemPreview | null> => {
    try {
      return unwrapResponse<ItemPreview>(await apiClient.get(`/courses/${courseId}/lessons/${lessonId}/preview`));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not open that item.'));
      return null;
    }
  }, []);

  const releaseUnit = useCallback(async (courseId: string, classIds: string[]): Promise<ReleaseResult | null> => {
    try {
      const result = unwrapResponse<ReleaseResult>(await apiClient.post(`/courses/${courseId}/release`, { classIds }));
      toast.success(`Released to ${result.classes.map((c) => c.name).join(', ')}`);
      return result;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not release the unit.'));
      return null;
    }
  }, []);

  return { createUnit, draftOutline, approveOutline, retryItem, previewItem, releaseUnit };
}

const POLL_MS = 3000;

/** Polls the writing of a unit's items while `active`; calls onSettled once it stops. */
export function useUnitGeneration(courseId: string, active: boolean, onSettled: () => void) {
  const [state, setState] = useState<GenerationPoll | null>(null);
  const settledRef = useRef(onSettled);
  useEffect(() => { settledRef.current = onSettled; }, [onSettled]);

  useEffect(() => {
    if (!active || !courseId) return undefined;
    let stopped = false;
    const tick = (): void => {
      apiClient.get(`/courses/${courseId}/generation`)
        .then((res) => {
          if (stopped) return;
          const next = unwrapResponse<GenerationPoll>(res);
          setState(next);
          if (next.generation.status === 'done' || next.generation.status === 'failed') {
            stopped = true;
            settledRef.current();
          }
        })
        .catch((err: unknown) => console.error('Generation poll failed', err));
    };
    tick();
    const timer = setInterval(() => { if (!stopped) tick(); }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [courseId, active]);

  return state;
}
