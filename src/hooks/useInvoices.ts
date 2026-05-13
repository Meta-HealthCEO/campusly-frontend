import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { SubscriptionInvoice } from '@/types/subscription';

export function useInvoices() {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiClient.get('/subscriptions/invoices');
        if (!cancelled) setInvoices(unwrapList<SubscriptionInvoice>(res));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { invoices, loading };
}
