'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type { BehaviourKind, Severity, TimelineItem } from '@/lib/behaviour';

export interface BehaviourSummary { merits: number; demerits: number; incidents: number; net: number }

export interface BehaviourFeedEntry {
  id: string;
  studentId: string;
  studentName: string;
  kind: BehaviourKind;
  category: string;
  points: number;
  severity: Severity | null;
  note: string;
  occurredAt: string;
  loggedByName: string | null;
  canUndo: boolean;
}

export interface LogBehaviourInput {
  studentId: string;
  kind: BehaviourKind;
  category: string;
  points?: number;
  severity?: Severity;
  note?: string;
  source: 'log' | 'profile' | 'roster' | 'register';
  /** The same key for the same log, so a double tap logs once. */
  requestKey: string;
}

const EMPTY: BehaviourSummary = { merits: 0, demerits: 0, incidents: 0, net: 0 };

/** Recent behaviour from one feed endpoint, newest first; nothing loads while params is null. */
function useFeed(path: string, params: Record<string, string> | null, failMessage: string) {
  const [entries, setEntries] = useState<BehaviourFeedEntry[]>([]);
  const [summary, setSummary] = useState<BehaviourSummary>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = params ? JSON.stringify(params) : '';

  const load = useCallback(async (): Promise<void> => {
    if (!key) return;
    setLoading(true);
    try {
      const data = unwrapResponse<{ entries: BehaviourFeedEntry[]; summary: BehaviourSummary }>(await apiClient.get(path, { params: JSON.parse(key) as Record<string, string> }));
      setEntries(data.entries ?? []);
      setSummary(data.summary ?? EMPTY);
      setError(null);
    } catch (err: unknown) {
      console.error('Behaviour feed failed', err);
      setError(extractErrorMessage(err, failMessage));
    } finally {
      setLoading(false);
    }
  }, [path, key, failMessage]);

  useEffect(() => { void load(); }, [load]);

  return { entries, summary, loading, error, refresh: load };
}

/** A class's recent behaviour, newest first. */
export function useClassBehaviour(classId: string) {
  return useFeed('/behaviour', classId ? { classId } : null, "Couldn't load this class's behaviour. Refresh to try again.");
}

/** The whole school's recent behaviour (admins and principals), optionally one kind. */
export function useSchoolBehaviour(kind: string) {
  return useFeed('/behaviour/school', kind ? { kind } : {}, "Couldn't load the school's behaviour log. Refresh to try again.");
}

/** Logging and undoing behaviour; the reason a log failed stays for the form to show. */
export function useBehaviourActions() {
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const log = useCallback(async (input: LogBehaviourInput): Promise<boolean> => {
    setLogging(true);
    setLogError(null);
    try {
      await apiClient.post('/behaviour', input);
      toast.success(input.kind === 'merit' ? 'Merit logged' : input.kind === 'demerit' ? 'Demerit logged' : 'Incident logged');
      return true;
    } catch (err: unknown) {
      setLogError(extractErrorMessage(err, "Couldn't log that. Try again."));
      return false;
    } finally {
      setLogging(false);
    }
  }, []);

  const undo = useCallback(async (entryId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/behaviour/${entryId}`);
      toast.success('Undone');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't undo that."));
      return false;
    }
  }, []);

  return { log, undo, logging, logError, clearLogError: () => setLogError(null) };
}

/** A learner's behaviour timeline (with the referrals the teacher made) and summary. */
export function useLearnerBehaviour(studentId: string) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [summary, setSummary] = useState<BehaviourSummary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!studentId) return;
    try {
      const data = unwrapResponse<{ items: TimelineItem[]; summary: BehaviourSummary }>(await apiClient.get(`/behaviour/student/${studentId}`));
      setItems(data.items ?? []);
      setSummary(data.summary ?? EMPTY);
      setError(null);
    } catch (err: unknown) {
      console.error('Learner behaviour failed', err);
      setError(extractErrorMessage(err, "Couldn't load this learner's behaviour."));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  return { items, summary, loading, error, refresh: load };
}
