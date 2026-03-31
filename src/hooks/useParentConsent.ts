import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useCurrentParent } from './useCurrentParent';
import type { ApiConsentForm } from '@/components/consent/types';
import { normalizeConsentForm } from '@/components/consent/types';

export interface PendingItem {
  form: ApiConsentForm;
  childId: string;
}

export interface CompletedItem {
  form: ApiConsentForm;
  childId: string;
}

interface ParentConsentResult {
  pendingForms: PendingItem[];
  completedForms: CompletedItem[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useParentConsent(): ParentConsentResult {
  const { parent, children, loading: parentLoading } = useCurrentParent();
  const [pendingForms, setPendingForms] = useState<PendingItem[]>([]);
  const [completedForms, setCompletedForms] = useState<CompletedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (parentLoading || !parent || children.length === 0) {
      if (!parentLoading) setLoading(false);
      return;
    }
    try {
      const pendingResults: PendingItem[] = [];
      const outstandingKeys = new Set<string>();

      const outstandingPromises = children.map((child) =>
        apiClient
          .get(`/consent/responses/outstanding/${child.id}`)
          .then((res) => ({ childId: child.id, res }))
          .catch(() => ({ childId: child.id, res: null })),
      );
      const outstandingResults = await Promise.all(outstandingPromises);

      for (const { childId, res } of outstandingResults) {
        if (!res) continue;
        const arr = unwrapList<Record<string, unknown>>(res);
        for (const item of arr) {
          const form = normalizeConsentForm(item);
          const key = `${form.id}-${childId}`;
          if (!outstandingKeys.has(key)) {
            outstandingKeys.add(key);
            pendingResults.push({ form, childId });
          }
        }
      }
      setPendingForms(pendingResults);

      // Fetch all forms to determine completed ones
      const formsRes = await apiClient.get('/consent/forms');
      const formsArr = unwrapList<Record<string, unknown>>(formsRes, 'forms');
      const allForms = formsArr.map(normalizeConsentForm);

      const completedResults: CompletedItem[] = [];
      const childIds = new Set(children.map((c) => c.id));

      for (const form of allForms) {
        for (const child of children) {
          const targets =
            form.targetStudents.length > 0
              ? form.targetStudents.includes(child.id)
              : childIds.has(child.id);
          if (!targets) continue;
          const key = `${form.id}-${child.id}`;
          if (!outstandingKeys.has(key)) {
            completedResults.push({ form, childId: child.id });
          }
        }
      }
      setCompletedForms(completedResults);
    } catch {
      console.error('Failed to load consent data');
    } finally {
      setLoading(false);
    }
  }, [parentLoading, parent, children]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { pendingForms, completedForms, loading, refetch: fetchData };
}
