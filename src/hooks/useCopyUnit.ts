'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClassUnit, type CopyUnitInput } from '@/hooks/useClassUnit';
import type { CopySource } from '@/lib/unit-library';

interface CopyTarget extends CopySource {
  courseId: string;
}

/** Copying a unit to one of the teacher's classes; on success, opens the copy. */
export function useCopyUnit() {
  const router = useRouter();
  const { copyUnit } = useClassUnit();
  const [target, setTarget] = useState<CopyTarget | null>(null);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback((next: CopyTarget) => {
    setError(null);
    setTarget(next);
  }, []);

  const close = useCallback(() => setTarget(null), []);

  const copy = useCallback(async (input: CopyUnitInput): Promise<void> => {
    if (!target) return;
    setCopying(true);
    setError(null);
    const result = await copyUnit(target.courseId, input);
    setCopying(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setTarget(null);
    router.push(`/teacher/courses/${result.id}`);
  }, [target, copyUnit, router]);

  return { target, copying, error, start, close, copy };
}
