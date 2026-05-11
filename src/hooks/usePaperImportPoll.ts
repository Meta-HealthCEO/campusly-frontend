'use client';

import { useEffect, useRef, useState } from 'react';
import { usePaperImport } from './usePaperImport';
import type { PaperImportJob } from '@/types';

const POLL_INTERVAL_MS = 3000;
const TERMINAL = new Set<PaperImportJob['status']>(['completed', 'failed', 'cancelled']);

export function usePaperImportPoll(jobId: string | null): { job: PaperImportJob | null; isPolling: boolean } {
  const { getJob } = usePaperImport();
  const [job, setJob] = useState<PaperImportJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    cancelledRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelledRef.current || !jobId) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      try {
        const next = await getJob(jobId);
        if (cancelledRef.current) return;
        setJob(next);
        if (!TERMINAL.has(next.status)) {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        } else {
          setIsPolling(false);
        }
      } catch {
        if (!cancelledRef.current) timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    setIsPolling(true);
    tick();

    const onVisibility = () => {
      if (!document.hidden && timer === null && !cancelledRef.current) tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [jobId, getJob]);

  return { job, isPolling };
}
