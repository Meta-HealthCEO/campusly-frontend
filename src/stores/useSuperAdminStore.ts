import { create } from 'zustand';
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

  // State setters
  setStats: (stats: PlatformStats | null) => void;
  setStatsLoading: (loading: boolean) => void;
  setTenants: (tenants: Tenant[], total: number, page: number) => void;
  setTenantsLoading: (loading: boolean) => void;
  setRevenue: (revenue: RevenueReport | null) => void;
  setRevenueLoading: (loading: boolean) => void;
  setInvoices: (invoices: PlatformInvoice[], total: number) => void;
  setInvoicesLoading: (loading: boolean) => void;
  setTickets: (tickets: SupportTicket[], total: number) => void;
  setTicketsLoading: (loading: boolean) => void;
  setSelectedTicket: (ticket: SupportTicket | null) => void;
  updateTicketInList: (ticket: SupportTicket) => void;
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

  setStats: (stats) => set({ stats }),
  setStatsLoading: (loading) => set({ statsLoading: loading }),
  setTenants: (tenants, total, page) =>
    set({ tenants, tenantsTotal: total, tenantsPage: page }),
  setTenantsLoading: (loading) => set({ tenantsLoading: loading }),
  setRevenue: (revenue) => set({ revenue }),
  setRevenueLoading: (loading) => set({ revenueLoading: loading }),
  setInvoices: (invoices, total) => set({ invoices, invoicesTotal: total }),
  setInvoicesLoading: (loading) => set({ invoicesLoading: loading }),
  setTickets: (tickets, total) => set({ tickets, ticketsTotal: total }),
  setTicketsLoading: (loading) => set({ ticketsLoading: loading }),
  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
  updateTicketInList: (ticket) => {
    set({ selectedTicket: ticket });
    const { tickets } = get();
    set({ tickets: tickets.map((t) => (t.id === ticket.id ? ticket : t)) });
  },
}));
