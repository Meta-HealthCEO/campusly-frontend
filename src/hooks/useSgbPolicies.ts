import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { SgbResolution, ProposePolicyPayload } from '@/types';

export function useSgbPolicyMutations() {
  const proposePolicy = async (payload: ProposePolicyPayload): Promise<SgbResolution> => {
    const res = await apiClient.post('/sgb/policies/propose', payload);
    return unwrapResponse<SgbResolution>(res);
  };

  return { proposePolicy };
}
