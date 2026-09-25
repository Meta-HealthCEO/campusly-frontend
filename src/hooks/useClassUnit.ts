'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import { isAILimitError } from '@/lib/ai-allowance';
import type { Course, ItemGenStatus } from '@/types/courses';
import type { PolledState } from '@/lib/course-unit';
import type { ContentBlockItem } from '@/types';
import type { EditableBlock, EditableQuestion, EditableStep, RewriteAction } from '@/lib/item-editing';

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

export interface CopyUnitInput { classId: string; termNumber: number; title?: string }
export type CopyUnitResult = { ok: true; id: string } | { ok: false; message: string };

/** Class units: create, outline with AI, approve, retry, preview and release. */
export function useClassUnit() {
  const createUnit = useCallback(async (input: CreateUnitInput): Promise<Course | null> => {
    try {
      return unwrapResponse<Course>(await apiClient.post('/courses/class-units', input));
    } catch (err: unknown) {
      // A used-up AI allowance already opened the upgrade prompt.
      if (!isAILimitError(err)) toast.error(extractErrorMessage(err, 'Could not start the unit. Please try again.'));
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
      // A used-up AI allowance already opened the upgrade prompt.
      if (!isAILimitError(err)) toast.error(extractErrorMessage(err, 'Could not approve the outline.'));
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

  /** Each returns null when done, or the reason it couldn't be (shown where the teacher is editing). */
  const saveContent = useCallback(async (courseId: string, lessonId: string, body: { blocks?: EditableBlock[]; steps?: EditableStep[] }): Promise<string | null> => {
    try {
      await apiClient.put(`/courses/${courseId}/lessons/${lessonId}/content`, body);
      toast.success('Saved');
      return null;
    } catch (err: unknown) {
      return extractErrorMessage(err, 'Could not save. Try again.');
    }
  }, []);

  const saveQuestions = useCallback(async (courseId: string, lessonId: string, questions: EditableQuestion[]): Promise<string | null> => {
    try {
      await apiClient.put(`/courses/${courseId}/lessons/${lessonId}/questions`, { questions });
      toast.success('Saved');
      return null;
    } catch (err: unknown) {
      return extractErrorMessage(err, 'Could not save. Try again.');
    }
  }, []);

  const rewriteItem = useCallback(async (courseId: string, lessonId: string, action: RewriteAction, language?: string): Promise<string | null> => {
    try {
      await apiClient.post(`/courses/${courseId}/lessons/${lessonId}/rewrite`, { action, ...(language ? { language } : {}) });
      toast.success('Rewritten. Check the new version.');
      return null;
    } catch (err: unknown) {
      return extractErrorMessage(err, 'The AI could not rewrite this just now. Try again in a moment.');
    }
  }, []);

  const updateSettings = useCallback(async (courseId: string, sequential: boolean): Promise<boolean> => {
    try {
      await apiClient.patch(`/courses/${courseId}/settings`, { sequential });
      toast.success(sequential ? 'Learners go in order' : 'Learners can open items in any order');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not save the setting.'));
      return false;
    }
  }, []);

  const addRevision = useCallback(async (courseId: string, afterLessonId: string, questionIds: string[]): Promise<string | null> => {
    try {
      await apiClient.post(`/courses/${courseId}/revision`, { afterLessonId, questionIds });
      toast.success('Revision item added after the check');
      return null;
    } catch (err: unknown) {
      return extractErrorMessage(err, 'The AI could not write a revision item just now. Try again in a moment.');
    }
  }, []);

  /** A copy of the unit for one of the teacher's classes: the new unit's id, or why it couldn't be made. */
  const copyUnit = useCallback(async (courseId: string, input: CopyUnitInput): Promise<CopyUnitResult> => {
    try {
      const copy = unwrapResponse<{ id: string }>(await apiClient.post(`/courses/${courseId}/copy`, input));
      toast.success('Unit copied. Check it, then release it to your class.');
      return { ok: true, id: copy.id };
    } catch (err: unknown) {
      return { ok: false, message: extractErrorMessage(err, 'Could not copy the unit. Try again.') };
    }
  }, []);

  return {
    createUnit, draftOutline, approveOutline, retryItem, previewItem, releaseUnit,
    saveContent, saveQuestions, rewriteItem, updateSettings, addRevision, copyUnit,
  };
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
