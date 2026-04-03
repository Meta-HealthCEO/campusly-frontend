import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { mapTenant, mapInvoice, mapTicket } from '@/lib/superadmin-mappers';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';
import type { RevenueReport } from '@/stores/useSuperAdminStore';
import type { Tenant, SupportTicket } from '@/types';

interface TenantListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
}

interface TicketListParams {
  page?: number;
  limit?: number;
  status?: string;
  tenantId?: string;
  sort?: string;
}

interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: string;
  sort?: string;
}

interface GenerateInvoiceInput {
  tenantId: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  tax?: number;
  dueDate: string;
  status?: string;
}

export function useSuperAdmin() {
  const setStats = useSuperAdminStore((s) => s.setStats);
  const setStatsLoading = useSuperAdminStore((s) => s.setStatsLoading);
  const setTenants = useSuperAdminStore((s) => s.setTenants);
  const setTenantsLoading = useSuperAdminStore((s) => s.setTenantsLoading);
  const setRevenue = useSuperAdminStore((s) => s.setRevenue);
  const setRevenueLoading = useSuperAdminStore((s) => s.setRevenueLoading);
  const setInvoices = useSuperAdminStore((s) => s.setInvoices);
  const setInvoicesLoading = useSuperAdminStore((s) => s.setInvoicesLoading);
  const setTickets = useSuperAdminStore((s) => s.setTickets);
  const setTicketsLoading = useSuperAdminStore((s) => s.setTicketsLoading);
  const updateTicketInList = useSuperAdminStore((s) => s.updateTicketInList);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiClient.get('/superadmin/stats');
      const raw = unwrapResponse(res);
      const t = raw.tenants ?? {};
      const r = raw.revenue ?? {};
      setStats({
        totalSchools: (t.total as number) ?? 0,
        totalStudents: 0,
        mrr: Math.round(((r.totalPaid as number) ?? 0) * 100),
        arr: Math.round(((r.totalPaid as number) ?? 0) * 100 * 12),
        activeTrials: (t.trial as number) ?? 0,
        outstanding: Math.round(((r.overdueInvoices as number) ?? 0) * 100),
      });
    } catch {
      console.error('Failed to fetch platform stats');
    } finally {
      setStatsLoading(false);
    }
  }, [setStats, setStatsLoading]);

  const fetchTenants = useCallback(async (params?: TenantListParams) => {
    setTenantsLoading(true);
    try {
      const res = await apiClient.get('/superadmin/tenants', { params });
      const raw = unwrapResponse(res);
      const list = Array.isArray(raw) ? raw : (raw.data ?? []);
      setTenants(
        (list as Record<string, unknown>[]).map(mapTenant),
        (raw.total as number) ?? 0,
        (raw.page as number) ?? 1,
      );
    } catch {
      console.error('Failed to fetch tenants');
    } finally {
      setTenantsLoading(false);
    }
  }, [setTenants, setTenantsLoading]);

  const fetchTenantDetail = useCallback(async (id: string): Promise<Tenant> => {
    const res = await apiClient.get(`/superadmin/tenants/${id}`);
    const raw = unwrapResponse(res);
    return mapTenant(raw as Record<string, unknown>);
  }, []);

  const updateTenantStatus = useCallback(async (id: string, status: string, notes?: string) => {
    await apiClient.patch(`/superadmin/tenants/${id}/status`, { status, notes });
  }, []);

  const updateTenantModules = useCallback(async (id: string, modules: string[]) => {
    await apiClient.patch(`/superadmin/tenants/${id}/modules`, {
      modulesEnabled: modules,
    });
  }, []);

  const suspendTenant = useCallback(async (id: string, reason: string) => {
    await apiClient.post(`/superadmin/tenants/${id}/suspend`, { reason });
  }, []);

  const fetchRevenue = useCallback(async (params?: { year?: number }) => {
    setRevenueLoading(true);
    try {
      const res = await apiClient.get('/superadmin/revenue', { params });
      const raw = unwrapResponse(res);
      const report: RevenueReport = {
        monthly: (raw.monthly ?? []) as RevenueReport['monthly'],
        summary: (raw.summary ?? {
          totalPaid: 0, totalPaidCount: 0,
          totalOverdue: 0, totalOverdueCount: 0,
          totalDraft: 0, totalDraftCount: 0,
        }) as RevenueReport['summary'],
      };
      setRevenue(report);
    } catch {
      console.error('Failed to fetch revenue');
    } finally {
      setRevenueLoading(false);
    }
  }, [setRevenue, setRevenueLoading]);

  const generateInvoice = useCallback(async (data: GenerateInvoiceInput) => {
    await apiClient.post('/superadmin/invoices', data);
  }, []);

  const fetchInvoicesByTenant = useCallback(async (tenantId: string, params?: InvoiceListParams) => {
    setInvoicesLoading(true);
    try {
      const res = await apiClient.get(
        `/superadmin/tenants/${tenantId}/invoices`,
        { params },
      );
      const raw = unwrapResponse(res);
      const list = Array.isArray(raw) ? raw : (raw.data ?? []);
      setInvoices(
        (list as Record<string, unknown>[]).map(mapInvoice),
        (raw.total as number) ?? 0,
      );
    } catch {
      console.error('Failed to fetch invoices');
    } finally {
      setInvoicesLoading(false);
    }
  }, [setInvoices, setInvoicesLoading]);

  const fetchTickets = useCallback(async (params?: TicketListParams) => {
    setTicketsLoading(true);
    try {
      const res = await apiClient.get('/superadmin/tickets', { params });
      const raw = unwrapResponse(res);
      const list = Array.isArray(raw) ? raw : (raw.data ?? []);
      setTickets(
        (list as Record<string, unknown>[]).map(mapTicket),
        (raw.total as number) ?? 0,
      );
    } catch {
      console.error('Failed to fetch tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, [setTickets, setTicketsLoading]);

  const fetchTicketDetail = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/superadmin/tickets/${id}`);
      const raw = unwrapResponse(res);
      const ticket = mapTicket(raw as Record<string, unknown>);
      updateTicketInList(ticket);
    } catch {
      console.error('Failed to fetch ticket detail');
    }
  }, [updateTicketInList]);

  const replyToTicket = useCallback(async (id: string, message: string, isInternal?: boolean) => {
    const res = await apiClient.post(`/superadmin/tickets/${id}/reply`, {
      message,
      isInternal: isInternal ?? false,
    });
    const raw = unwrapResponse(res);
    const ticket = mapTicket(raw as Record<string, unknown>);
    updateTicketInList(ticket);
  }, [updateTicketInList]);

  const assignTicket = useCallback(async (id: string, assignedTo: string) => {
    const res = await apiClient.patch(`/superadmin/tickets/${id}/assign`, {
      assignedTo,
    });
    const raw = unwrapResponse(res);
    const ticket = mapTicket(raw as Record<string, unknown>);
    updateTicketInList(ticket);
  }, [updateTicketInList]);

  const updateTicketStatus = useCallback(async (id: string, status: SupportTicket['status']) => {
    const res = await apiClient.patch(`/superadmin/tickets/${id}/status`, {
      status,
    });
    const raw = unwrapResponse(res);
    const ticket = mapTicket(raw as Record<string, unknown>);
    updateTicketInList(ticket);
  }, [updateTicketInList]);

  const registerAdmin = useCallback(async (data: {
    firstName: string; lastName: string; email: string;
    password: string; role: string; schoolId: string;
  }) => {
    await apiClient.post('/auth/register', data);
  }, []);

  const fetchPlatformAnalytics = useCallback(async () => {
    try {
      const res = await apiClient.get('/superadmin/analytics');
      return unwrapResponse(res) as {
        mrr: number; arr: number; growthRate: number; churnCount: number;
        activeSchools: number; totalSchools: number; activeUsers: number;
      };
    } catch {
      console.error('Failed to fetch platform analytics');
      return null;
    }
  }, []);

  const fetchTenantHealth = useCallback(async (schoolId: string) => {
    try {
      const res = await apiClient.get(`/superadmin/tenants/${schoolId}/health`);
      return unwrapResponse(res) as {
        score: number;
        components: Array<{ label: string; value: number; weight: number }>;
        risk: 'healthy' | 'at_risk' | 'critical';
      };
    } catch {
      console.error('Failed to fetch tenant health');
      return null;
    }
  }, []);

  const fetchHealthOverview = useCallback(async () => {
    try {
      const res = await apiClient.get('/superadmin/health-overview');
      const raw = unwrapResponse(res);
      return (Array.isArray(raw) ? raw : []) as Array<{
        tenantId: string; schoolId: string; schoolName: string;
        status: string; score: number; risk: 'healthy' | 'at_risk' | 'critical'; tier: string;
      }>;
    } catch {
      console.error('Failed to fetch health overview');
      return [];
    }
  }, []);

  return {
    fetchStats,
    fetchTenants,
    fetchTenantDetail,
    updateTenantStatus,
    updateTenantModules,
    suspendTenant,
    fetchRevenue,
    generateInvoice,
    fetchInvoicesByTenant,
    fetchTickets,
    fetchTicketDetail,
    replyToTicket,
    assignTicket,
    updateTicketStatus,
    registerAdmin,
    fetchPlatformAnalytics,
    fetchTenantHealth,
    fetchHealthOverview,
  };
}
