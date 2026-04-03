'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type {
  Policy,
  PolicyAcknowledgement,
  CreatePolicyPayload,
  PolicyFilters,
} from '@/types';

export function useGovernancePolicies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [acknowledgements, setAcknowledgements] = useState<PolicyAcknowledgement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPolicies = useCallback(async (filters?: PolicyFilters) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/governance/policies', { params: filters });
      setPolicies(unwrapList<Policy>(response));
    } catch (err: unknown) {
      console.error('Failed to fetch policies:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPolicy = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/governance/policies/${id}`);
      const policy = unwrapResponse<Policy>(response);
      setActivePolicy(policy);
      return policy;
    } catch (err: unknown) {
      console.error('Failed to fetch policy:', extractErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPolicy = useCallback(async (data: CreatePolicyPayload) => {
    try {
      const response = await apiClient.post('/governance/policies', data);
      const policy = unwrapResponse<Policy>(response);
      setPolicies((prev) => [policy, ...prev]);
      toast.success('Policy created');
      return policy;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to create policy');
      return null;
    }
  }, []);

  const updatePolicy = useCallback(async (id: string, data: Partial<CreatePolicyPayload>) => {
    try {
      const response = await apiClient.put(`/governance/policies/${id}`, data);
      const updated = unwrapResponse<Policy>(response);
      setPolicies((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (activePolicy?.id === id) setActivePolicy(updated);
      toast.success('Policy updated');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to update policy');
      return null;
    }
  }, [activePolicy]);

  const deletePolicy = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/governance/policies/${id}`);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      if (activePolicy?.id === id) setActivePolicy(null);
      toast.success('Policy deleted');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to delete policy');
    }
  }, [activePolicy]);

  const acknowledgePolicy = useCallback(async (policyId: string) => {
    try {
      const response = await apiClient.post(`/governance/policies/${policyId}/acknowledge`);
      const ack = unwrapResponse<PolicyAcknowledgement>(response);
      setAcknowledgements((prev) => [...prev, ack]);
      toast.success('Policy acknowledged');
      return ack;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to acknowledge policy');
      return null;
    }
  }, []);

  const fetchAcknowledgements = useCallback(async (policyId: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/governance/policies/${policyId}/acknowledgements`);
      const list = unwrapList<PolicyAcknowledgement>(response);
      setAcknowledgements(list);
      return list;
    } catch (err: unknown) {
      console.error('Failed to fetch acknowledgements:', extractErrorMessage(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    policies, activePolicy, acknowledgements, loading,
    fetchPolicies, fetchPolicy, createPolicy, updatePolicy, deletePolicy,
    acknowledgePolicy, fetchAcknowledgements,
  };
}
