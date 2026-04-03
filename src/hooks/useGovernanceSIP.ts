'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type {
  SIPPlan,
  SIPGoal,
  SIPDashboard,
  SIPEvidence,
  SIPReview,
  CreateSIPPlanPayload,
  CreateSIPGoalPayload,
  CreateSIPReviewPayload,
  SIPFilters,
} from '@/types';

export function useGovernanceSIP() {
  const [plans, setPlans] = useState<SIPPlan[]>([]);
  const [activePlan, setActivePlan] = useState<SIPPlan | null>(null);
  const [goals, setGoals] = useState<SIPGoal[]>([]);
  const [dashboard, setDashboard] = useState<SIPDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPlans = useCallback(async (filters?: SIPFilters) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/governance/sip', { params: filters });
      setPlans(unwrapList<SIPPlan>(response));
    } catch (err: unknown) {
      console.error('Failed to fetch SIP plans:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlan = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/governance/sip/${id}`);
      const plan = unwrapResponse<SIPPlan>(response);
      setActivePlan(plan);
      return plan;
    } catch (err: unknown) {
      console.error('Failed to fetch SIP plan:', extractErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlan = useCallback(async (data: CreateSIPPlanPayload) => {
    try {
      const response = await apiClient.post('/governance/sip', data);
      const plan = unwrapResponse<SIPPlan>(response);
      setPlans((prev) => [plan, ...prev]);
      toast.success('SIP plan created');
      return plan;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to create SIP plan');
      return null;
    }
  }, []);

  const updatePlan = useCallback(async (id: string, data: Partial<CreateSIPPlanPayload>) => {
    try {
      const response = await apiClient.put(`/governance/sip/${id}`, data);
      const updated = unwrapResponse<SIPPlan>(response);
      setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (activePlan?.id === id) setActivePlan(updated);
      toast.success('SIP plan updated');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to update SIP plan');
      return null;
    }
  }, [activePlan]);

  const deletePlan = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/governance/sip/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      if (activePlan?.id === id) setActivePlan(null);
      toast.success('SIP plan deleted');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to delete SIP plan');
    }
  }, [activePlan]);

  const fetchGoals = useCallback(async (sipId: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/governance/sip/${sipId}/goals`);
      setGoals(unwrapList<SIPGoal>(response));
    } catch (err: unknown) {
      console.error('Failed to fetch SIP goals:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const createGoal = useCallback(async (sipId: string, data: CreateSIPGoalPayload) => {
    try {
      const response = await apiClient.post(`/governance/sip/${sipId}/goals`, data);
      const goal = unwrapResponse<SIPGoal>(response);
      setGoals((prev) => [...prev, goal]);
      toast.success('Goal added');
      return goal;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to create goal');
      return null;
    }
  }, []);

  const updateGoal = useCallback(async (goalId: string, data: Partial<CreateSIPGoalPayload>) => {
    try {
      const response = await apiClient.put(`/governance/sip/goals/${goalId}`, data);
      const updated = unwrapResponse<SIPGoal>(response);
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
      toast.success('Goal updated');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to update goal');
      return null;
    }
  }, []);

  const addEvidence = useCallback(async (goalId: string, data: Omit<SIPEvidence, 'id' | 'goalId' | 'uploadedBy' | 'createdAt'>) => {
    try {
      const response = await apiClient.post(`/governance/sip/goals/${goalId}/evidence`, data);
      toast.success('Evidence added');
      return unwrapResponse<SIPEvidence>(response);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to add evidence');
      return null;
    }
  }, []);

  const addReview = useCallback(async (goalId: string, data: CreateSIPReviewPayload) => {
    try {
      const response = await apiClient.post(`/governance/sip/goals/${goalId}/reviews`, data);
      toast.success('Review submitted');
      return unwrapResponse<SIPReview>(response);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err) ?? 'Failed to submit review');
      return null;
    }
  }, []);

  const fetchDashboard = useCallback(async (sipId: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/governance/sip/dashboard', { params: { sipId } });
      const data = unwrapResponse<SIPDashboard>(response);
      setDashboard(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch SIP dashboard:', extractErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    plans, activePlan, goals, dashboard, loading,
    fetchPlans, fetchPlan, createPlan, updatePlan, deletePlan,
    fetchGoals, createGoal, updateGoal, addEvidence, addReview, fetchDashboard,
  };
}
