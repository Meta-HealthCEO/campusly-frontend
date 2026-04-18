'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';

export function useClassroomRecording(sessionId: string | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      setDuration(0);
      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.post(`/classroom/sessions/${sessionId}/recording/start`);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err: unknown) {
      console.error('Failed to start recording', err);
      toast.error(extractErrorMessage(err, 'Failed to start recording'));
    }
  }, [sessionId]);

  const stopRecording = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.post(`/classroom/sessions/${sessionId}/recording/stop`);
      setIsRecording(false);
      toast.success('Recording stopped. AI notes will be generated shortly.');
    } catch (err: unknown) {
      console.error('Failed to stop recording', err);
      toast.error(extractErrorMessage(err, 'Failed to stop recording'));
    }
  }, [sessionId]);

  const formatDuration = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    duration,
    formattedDuration: formatDuration(duration),
    startRecording,
    stopRecording,
  };
}
