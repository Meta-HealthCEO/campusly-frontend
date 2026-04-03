'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BookOpen, Plus, Target } from 'lucide-react';
import { useGovernanceSIP } from '@/hooks/useGovernanceSIP';
import { useGovernancePolicies } from '@/hooks/useGovernancePolicies';
import {
  SIPDashboardView, SIPPlanList, SIPPlanCreateDialog,
  SIPGoalList, SIPGoalCreateDialog,
  PolicyList, PolicyCreateDialog,
} from '@/components/governance';
import type { SIPPlan, SIPGoal, CreateSIPPlanPayload, CreateSIPGoalPayload, Policy, CreatePolicyPayload } from '@/types';

export default function GovernancePage() {
  const router = useRouter();
  const {
    plans, activePlan, goals, dashboard, loading: sipLoading,
    fetchPlans, fetchPlan, createPlan, updatePlan, deletePlan,
    fetchGoals, createGoal, updateGoal, fetchDashboard,
  } = useGovernanceSIP();
  const {
    policies, loading: policyLoading,
    fetchPolicies, createPolicy, updatePolicy,
  } = useGovernancePolicies();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SIPPlan | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SIPGoal | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  useEffect(() => { fetchPlans(); fetchPolicies(); }, [fetchPlans, fetchPolicies]);

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) setSelectedPlanId(plans[0].id);
  }, [plans, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlanId) return;
    fetchPlan(selectedPlanId);
    fetchGoals(selectedPlanId);
    fetchDashboard(selectedPlanId);
  }, [selectedPlanId, fetchPlan, fetchGoals, fetchDashboard]);

  // SIP handlers
  const handleCreatePlan = useCallback(async (data: CreateSIPPlanPayload) => {
    await createPlan(data);
    await fetchPlans();
    setPlanDialogOpen(false);
  }, [createPlan, fetchPlans]);

  const handleUpdatePlan = useCallback(async (id: string, data: Partial<SIPPlan>) => {
    await updatePlan(id, data);
    await fetchPlans();
    setPlanDialogOpen(false);
    setEditingPlan(null);
  }, [updatePlan, fetchPlans]);

  const handleCreateGoal = useCallback(async (data: CreateSIPGoalPayload) => {
    await createGoal(selectedPlanId, data);
    await fetchGoals(selectedPlanId);
    await fetchDashboard(selectedPlanId);
    setGoalDialogOpen(false);
  }, [createGoal, selectedPlanId, fetchGoals, fetchDashboard]);

  const handleUpdateGoal = useCallback(async (id: string, data: Partial<SIPGoal>) => {
    await updateGoal(id, data);
    await fetchGoals(selectedPlanId);
    await fetchDashboard(selectedPlanId);
    setGoalDialogOpen(false);
    setEditingGoal(null);
  }, [updateGoal, selectedPlanId, fetchGoals, fetchDashboard]);

  // Policy handlers
  const handleCreatePolicy = useCallback(async (data: CreatePolicyPayload) => {
    await createPolicy(data);
    await fetchPolicies();
    setPolicyDialogOpen(false);
  }, [createPolicy, fetchPolicies]);

  const handleUpdatePolicy = useCallback(async (id: string, data: Partial<Policy>) => {
    await updatePolicy(id, data);
    await fetchPolicies();
    setPolicyDialogOpen(false);
    setEditingPolicy(null);
  }, [updatePolicy, fetchPolicies]);

  const loading = sipLoading || policyLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="Governance" description="School Improvement Plans and Policy Management">
        {plans.length > 0 && (
          <Select value={selectedPlanId} onValueChange={(v: unknown) => setSelectedPlanId(v as string)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select SIP" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title} ({p.year})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">SIP Dashboard</TabsTrigger>
          <TabsTrigger value="plans">SIP Plans</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          {loading ? <LoadingSpinner /> : <SIPDashboardView dashboard={dashboard} />}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPlan(null); setPlanDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New SIP
            </Button>
          </div>
          {sipLoading ? <LoadingSpinner /> : plans.length === 0 ? (
            <EmptyState icon={Target} title="No improvement plans" description="Create your first School Improvement Plan." />
          ) : (
            <SIPPlanList
              plans={plans}
              onSelect={setSelectedPlanId}
              onEdit={(p) => { setEditingPlan(p); setPlanDialogOpen(true); }}
              onDelete={deletePlan}
            />
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-4 mt-4">
          {selectedPlanId ? (
            <>
              <div className="flex justify-end">
                <Button onClick={() => { setEditingGoal(null); setGoalDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Goal
                </Button>
              </div>
              {sipLoading ? <LoadingSpinner /> : goals.length === 0 ? (
                <EmptyState icon={Target} title="No goals" description="Add goals to this improvement plan." />
              ) : (
                <SIPGoalList
                  goals={goals}
                  onSelect={(id) => router.push(`/admin/governance/sip/${selectedPlanId}/goals/${id}`)}
                  onEdit={(g) => { setEditingGoal(g); setGoalDialogOpen(true); }}
                />
              )}
            </>
          ) : (
            <EmptyState icon={Target} title="Select a plan" description="Choose a SIP plan to view its goals." />
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPolicy(null); setPolicyDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Policy
            </Button>
          </div>
          {policyLoading ? <LoadingSpinner /> : policies.length === 0 ? (
            <EmptyState icon={BookOpen} title="No policies" description="Create your first policy document." />
          ) : (
            <PolicyList
              policies={policies}
              onView={(id) => router.push(`/admin/governance/policies/${id}`)}
              onEdit={(p) => { setEditingPolicy(p); setPolicyDialogOpen(true); }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SIPPlanCreateDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        plan={editingPlan}
        onSubmit={handleCreatePlan}
        onUpdate={handleUpdatePlan}
      />
      <SIPGoalCreateDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        goal={editingGoal}
        sipId={selectedPlanId}
        onSubmit={handleCreateGoal}
        onUpdate={handleUpdateGoal}
      />
      <PolicyCreateDialog
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        policy={editingPolicy}
        onSubmit={handleCreatePolicy}
        onUpdate={handleUpdatePolicy}
      />
    </div>
  );
}
