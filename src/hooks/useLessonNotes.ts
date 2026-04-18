'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: number; // seconds
}

export interface TeacherQuestion {
  question: string;
  answer: string;
  timestamp: string;
}

export interface StudentQuestion {
  student: string;
  question: string;
  response: string;
  source: 'chat' | 'verbal';
}

export interface PollResultNote {
  question: string;
  options: string[];
  responseCounts: number[];
  totalResponses: number;
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface LessonNoteData {
  summary: string;
  keyConcepts: string[];
  teacherQuestions: TeacherQuestion[];
  studentQuestions: StudentQuestion[];
  pollResults: PollResultNote[];
  actionItems: string[];
  keyTerms: KeyTerm[];
}

export interface LessonNote {
  id: string;
  sessionId: string;
  recordingUrl: string;
  transcript: TranscriptSegment[];
  notes: LessonNoteData;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export function useLessonNotes(sessionId: string | null) {
  const [note, setNote] = useState<LessonNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNote = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/classroom/sessions/${sessionId}/notes`);
      setNote(unwrapResponse<LessonNote>(res));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setNote(null);
      } else {
        console.error('Failed to load lesson notes', err);
        setError(extractErrorMessage(err, 'Failed to load lesson notes'));
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const retry = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.post(`/classroom/sessions/${sessionId}/notes/retry`);
      toast.success('Retrying lesson notes generation');
      await fetchNote();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to retry'));
    }
  }, [sessionId, fetchNote]);

  return { note, loading, error, refetch: fetchNote, retry };
}

export function useClassLessonNotes(classId: string | null) {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;

    async function fetchNotes() {
      try {
        const res = await apiClient.get(`/classroom/notes/class/${classId}`);
        if (!cancelled) setNotes(unwrapList<LessonNote>(res));
      } catch (err: unknown) {
        console.error('Failed to load class notes', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNotes();
    return () => { cancelled = true; };
  }, [classId]);

  return { notes, loading };
}
