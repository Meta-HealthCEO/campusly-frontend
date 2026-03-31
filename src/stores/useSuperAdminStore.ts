import { create } from 'zustand';
import apiClient from '@/lib/api-client';
import { mapTenant, mapInvoice, mapTicket } from '@/lib/superadmin-mappers';
import type {
  Tenant,
  PlatformInvoice,
  SupportTicket,
  PlatformStats,
} from '@/types';

interface RevenueMonthly {
  _id: { year: number; month: number };
  revenue: number;
  invoiceCount: number;
}

interface RevenueSummary {
  totalPaid: number;
  totalPaidCount: number;
  totalOverdue: number;
  totalOverdueCount: number;
  totalDraft: number;
  totalDraftCount: number;
}

export interface RevenueReport {
  monthly: RevenueMonthly[];
  summary: RevenueSummary;
}

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

interface SuperAdminState {
  stats: PlatformStats | null;
  statsLoading: boolean;

  tenants: Tenant[];
  tenantsTotal: number;
  tenantsPage: number;
  tenantsLoading: boolean;

  revenue: RevenueReport | null;
  revenueLoading: boolean;

  invoices: PlatformInvoice[];
  invoicesTotal: number;
  invoicesLoading: boolean;

  tickets: SupportTicket[];
  ticketsTotal: number;
  ticketsLoading: boolean;
  selectedTicket: SupportTicket | null;

  fetchStats: () => Promise<void>;
  fetchTenants: (params?: TenantListParams) => Promise<void>;
  fetchTenantDetail: (id: string) => Promise<Tenant>;
  updateTenantStatus: (id: string, status: string, notes?: string) => Promise<void>;
  updateTenantModules: (id: string, modules: string[]) => Promise<void>;
  suspendTenant: (id: string, reason: string) => Promise<void>;
  fetchRevenue: (params?: { year?: number }) => Promise<void>;
  generateInvoice: (data: GenerateInvoiceInput) => Promise<void>;
  fetchInvoicesByTenant: (tenantId: string, params?: InvoiceListParams) => Promise<void>;
  fetchTickets: (params?: TicketListParams) => Promise<void>;
  fetchTicketDetail: (id: string) => Promise<void>;
  replyToTicket: (id: string, message: string, isInternal?: boolean) => Promise<void>;
  assignTicket: (id: string, assignedTo: string) => Promise<void>;
  updateTicketStatus: (id: string, status: SupportTicket['status']) => Promise<void>;
  setSelectedTicket: (ticket: SupportTicket | null) => void;
}

export const useSuperAdminStore = create<SuperAdminState>((set, get) => ({
  stats: null,
  statsLoading: false,
  tenants: [],
  tenantsTotal: 0,
  tenantsPage: 1,
  tenantsLoading: false,
  revenue: null,
  revenueLoading: false,
  invoices: [],
  invoicesTotal: 0,
  invoicesLoading: false,
  tickets: [],
  ticketsTotal: 0,
  ticketsLoading: false,
  selectedTicket: null,

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const res = await apiClient.get('/superadmin/stats');
      const raw = res.data.data ?? res.data;
      const t = raw.tenants ?? {};
      const r = raw.revenue ?? {};
      set({
        stats: {
          totalSchools: (t.total as number) ?? 0,
          totalStudents: 0,
          mrr: Math.round(((r.totalPaid as number) ?? 0) * 100),
          arr: Math.round(((r.totalPaid as number) ?? 0) * 100 * 12),
          activeTrials: (t.trial as number) ?? 0,
          outstanding: Math.round(((r.overdueInvoices as number) ?? 0) * 100),
        },
      });
    } catch {
      console.error('Failed to fetch platform stats');
    } finally {
      set({ statsLoading: false });
    }
  },

  fetchTenants: async (params) => {
    set({ tenantsLoading: true });
    try {
      const res = await apiClient.get('/superadmin/tenants', { params });
      const raw = res.data.data ?? res.data;
      const list = Array.isArray(raw) ? raw : (raw.data ?? []);
      set({
        tenants: (list as Record<string, unknown>[]).map(mapTenant),
        tenantsTotal: (raw.total as number) ?? 0,
        tenantsPage: (raw.page as number) ?? 1,
      });
    } catch {
      console.error('Failed to fetch tenants');
    } finally {
      set({ tenantsLoading: false });
    }
  },

  fetchTenantDetail: async (id) => {
    const res = await apiClient.get(`/superadmin/tenants/${id}`);
    const raw = res.data.data ?? res.data;
    return mapTenant(raw as Record<string, unknown>);
  },

  updateTenantStatus: async (id, status, notes) => {
    await apiClient.patch(`/superadmin/tenants/${id}/status`, { status, notes });
  },

  updateTenantModules: async (id, modules) => {
    await apiClient.patch(`/superadmin/tenants/${id}/modules`, {
      modulesEnabled: modules,
    });
  },

  suspendTenant: async (id, reason) => {
    await apiClient.post(`/superadmin/tenants/${id}/suspend`, { reason });
  },

  fetchRevenue: async (params) => {
    set({ revenueLoading: true });
    try {
      const res = await apiClient.get('/superadmin/revenue', { params });
      const raw = res.data.data ?? res.data;
      set({
        revenue: {
          monthly: (raw.monthly ?? []) as RevenueMonthly[],
          summary: (raw.summary ?? {
            totalPaid: 0, totalPaidCount: 0,
            totalOverdue: 0, totalOverdueCount: 0,
            totalDraft: 0, totalDraftCount: 0,
          }) as RevenueSummary,
        },
      });
    } catch {
      console.error('Failed to fetch revenue');
    } finally {
      set({ revenueLoading: false });
    }
  },

  generateInvoice: async (data) => {
    await apiClient.post('/superadmin/invoices', data);
  },

  fetchInvoicesByTenant: async (tenantId, params) => {
    set({ invoicesLoading: true });
    try {
      const res = await apiClient.get(
        `/superadmin/tenants/${tenantId}/invoices`,
        { params }
      );
      const raw = res.data.data ?? res.data;
      const list = Array.isArray(raw) ? raw : (raw.data ?? []);
      set({
        invoices: (list as Record<string, unknown>[]).map(mapInvoice),
        invoicesTotal: (raw.total as number) ?? 0,
      });
    } catch {
      console.error('Failed to fetch invoices');
    } finally {
      set({ invoicesLoading: false });
    }
  },

  fetchTickets: async (params) => {
    set({ ticketsLoading: true });
    try {
      const res = await apiClient.get('/superadmin/tickets', { params });
      const raw = res.data.data ?? res.data;
      const list = Array.isArray(raw) ? raw : (raw.data ?? []);
      set({
        tickets: (list as Record<string, unknown>[]).map(mapTicket),
        ticketsTotal: (raw.total as number) ?? 0,
      });
    } catch {
      console.error('Failed to fetch tickets');
    } finally {
      set({ ticketsLoading: false });
    }
  },

  fetchTicketDetail: async (id) => {
    try {
      const res = await apiClient.get(`/superadmin/tickets/${id}`);
      const raw = res.data.data ?? res.data;
      const ticket = mapTicket(raw as Record<string, unknown>);
      set({ selectedTicket: ticket });
      const { tickets } = get();
      set({ tickets: tickets.map((t) => (t.id === ticket.id ? ticket : t)) });
    } catch {
      console.error('Failed to fetch ticket detail');
    }
  },

  replyToTicket: async (id, message, isInternal) => {
    const res = await apiClient.post(`/superadmin/tickets/${id}/reply`, {
      message,
      isInternal: isInternal ?? false,
    });
    const raw = res.data.data ?? res.data;
    const ticket = mapTicket(raw as Record<string, unknown>);
    set({ selectedTicket: ticket });
    const { tickets } = get();
    set({ tickets: tickets.map((t) => (t.id === ticket.id ? ticket : t)) });
  },

  assignTicket: async (id, assignedTo) => {
    const res = await apiClient.patch(`/superadmin/tickets/${id}/assign`, {
      assignedTo,
    });
    const raw = res.data.data ?? res.data;
    const ticket = mapTicket(raw as Record<string, unknown>);
    set({ selectedTicket: ticket });
    const { tickets } = get();
    set({ tickets: tickets.map((t) => (t.id === ticket.id ? ticket : t)) });
  },

  updateTicketStatus: async (id, status) => {
    const res = await apiClient.patch(`/superadmin/tickets/${id}/status`, {
      status,
    });
    const raw = res.data.data ?? res.data;
    const ticket = mapTicket(raw as Record<string, unknown>);
    set({ selectedTicket: ticket });
    const { tickets } = get();
    set({ tickets: tickets.map((t) => (t.id === ticket.id ? ticket : t)) });
  },

  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
}));
