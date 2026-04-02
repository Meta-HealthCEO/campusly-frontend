// ============================================================
// Super Admin / Platform Types
// ============================================================

export type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
export type SubscriptionTier = 'starter' | 'growth' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  tier: SubscriptionTier;
  studentCount: number;
  mrr: number; // cents
  adminEmail: string;
  adminName: string;
  city: string;
  province: string;
  enabledModules: string[];
  createdAt: string;
  trialEndsAt?: string;
  logo?: string;
}

export interface PlatformInvoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  amount: number; // cents
  status: 'paid' | 'sent' | 'overdue' | 'draft';
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  tier: SubscriptionTier;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'tenant' | 'support';
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  assignedTo?: string;
}

export interface PlatformStats {
  totalSchools: number;
  totalStudents: number;
  mrr: number; // cents
  arr: number; // cents
  activeTrials: number;
  outstanding: number; // cents
}
