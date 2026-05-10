import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface AcademicLookupItem {
  _id: string;
  id?: string;
  name: string;
}

/**
 * Lightweight lookups hook for forms/filters that only need
 * `_id` + `name` for classes and subjects. Heavier hooks
 * (`useClasses`, `useSubjects`) return the full domain shape;
 * use this when you only care about IDs and labels.
 */
export function useAcademicLookups() {
  const [classes, setClasses] = useState<AcademicLookupItem[]>([]);
  const [subjects, setSubjects] = useState<AcademicLookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [classesRes, subjectsRes] = await Promise.all([
          apiClient.get('/academic/classes'),
          apiClient.get('/academic/subjects'),
        ]);
        if (cancelled) return;
        setClasses(unwrapList<AcademicLookupItem>(classesRes));
        setSubjects(unwrapList<AcademicLookupItem>(subjectsRes));
      } catch {
        if (!cancelled) {
          console.warn('Failed to load academic lookups');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { classes, subjects, loading };
}
