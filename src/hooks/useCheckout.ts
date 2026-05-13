import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { CheckoutInitResponse } from '@/types/subscription';

export function useCheckout() {
  const [loading, setLoading] = useState(false);

  const launch = useCallback(async (planCode: 'pro_monthly' | 'pro_annual') => {
    setLoading(true);
    try {
      const res = await apiClient.post('/subscriptions/checkout', { planCode });
      const { redirectUrl, sessionId } = unwrapResponse<CheckoutInitResponse>(res);

      if (typeof window !== 'undefined') {
        // Stash sessionId so /subscription/success can correlate when we return.
        sessionStorage.setItem('campusly.checkoutSession', sessionId);
        // Full-page redirect to OneGate's hosted card page. 3DS is handled there.
        window.location.href = redirectUrl;
      }
      return { sessionId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start checkout';
      toast.error(msg);
      setLoading(false);
      throw err;
    }
  }, []);

  return { launch, loading };
}
