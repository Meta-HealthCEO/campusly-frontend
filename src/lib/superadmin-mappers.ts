import type {
  Tenant,
  PlatformInvoice,
  SupportTicket,
  SupportMessage,
} from '@/types';

export function mapTenant(raw: Record<string, unknown>): Tenant {
  const school = raw.schoolId as Record<string, unknown> | string | undefined;
  const sub = raw.subscription as Record<string, unknown> | undefined;
  const usage = raw.usage as Record<string, unknown> | undefined;
  const billing = raw.billingContact as Record<string, unknown> | undefined;

  const schoolName = typeof school === 'object' && school
    ? (school.name as string) ?? '' : '';
  const schoolEmail = typeof school === 'object' && school
    ? (school.email as string) ?? '' : '';

  return {
    id: (raw._id ?? raw.id) as string,
    name: schoolName || (raw.name as string) || '',
    slug: (raw.slug as string) || '',
    status: (raw.status as Tenant['status']) || 'trial',
    tier: (sub?.tier as Tenant['tier']) || 'starter',
    studentCount: (usage?.currentStudents as number) || 0,
    mrr: ((sub?.price as number) || 0) * 100,
    adminEmail: (billing?.email as string) || schoolEmail || '',
    adminName: (billing?.name as string) || '',
    city: typeof school === 'object' && school
      ? ((school.address as Record<string, unknown>)?.city as string) ?? '' : '',
    province: typeof school === 'object' && school
      ? ((school.address as Record<string, unknown>)?.province as string) ?? '' : '',
    enabledModules: (raw.modulesEnabled as string[]) || [],
    createdAt: (raw.createdAt as string) || '',
    trialEndsAt: (raw.trialEndDate as string) || undefined,
    logo: undefined,
  };
}

export function mapInvoice(raw: Record<string, unknown>): PlatformInvoice {
  const tenant = raw.tenantId as Record<string, unknown> | string | undefined;
  const tenantName = typeof tenant === 'object' && tenant
    ? (tenant.name as string) ?? '' : '';

  return {
    id: (raw._id ?? raw.id) as string,
    invoiceNumber: (raw.invoiceNumber as string) || '',
    tenantId: typeof tenant === 'object' && tenant
      ? (tenant._id as string) ?? '' : (tenant as string) ?? '',
    tenantName,
    amount: Math.round(((raw.total as number) || (raw.amount as number) || 0) * 100),
    status: (raw.status as PlatformInvoice['status']) || 'draft',
    issuedDate: (raw.issuedDate as string) || '',
    dueDate: (raw.dueDate as string) || '',
    paidDate: (raw.paidDate as string) || undefined,
    tier: 'starter',
  };
}

export function mapMessage(raw: Record<string, unknown>): SupportMessage {
  const sender = raw.senderId as Record<string, unknown> | string | undefined;
  const senderName = typeof sender === 'object' && sender
    ? `${sender.firstName ?? ''} ${sender.lastName ?? ''}`.trim()
    : '';
  const senderId = typeof sender === 'object' && sender
    ? (sender._id as string) ?? '' : (sender as string) ?? '';

  return {
    id: (raw._id ?? raw.id) as string,
    ticketId: '',
    senderId,
    senderName: senderName || 'Unknown',
    senderRole: (raw.isInternal as boolean) ? 'support' : 'support',
    body: (raw.message as string) || (raw.body as string) || '',
    createdAt: (raw.timestamp as string) || (raw.createdAt as string) || '',
  };
}

export function mapTicket(raw: Record<string, unknown>): SupportTicket {
  const messages = (raw.messages as Record<string, unknown>[]) || [];
  const assigned = raw.assignedTo as Record<string, unknown> | string | undefined;
  const assignedName = typeof assigned === 'object' && assigned
    ? `${assigned.firstName ?? ''} ${assigned.lastName ?? ''}`.trim()
    : (assigned as string) || undefined;

  const tenant = raw.tenantId as Record<string, unknown> | string | undefined;
  const tenantName = typeof tenant === 'object' && tenant
    ? (tenant.name as string) ?? ''
    : '';

  const priority = (raw.priority as string) || 'medium';

  return {
    id: (raw._id ?? raw.id) as string,
    ticketNumber: (raw.ticketNumber as string) || `TKT-${(raw._id ?? raw.id) as string}`,
    tenantId: typeof tenant === 'object' && tenant
      ? (tenant._id as string) ?? '' : (tenant as string) ?? '',
    tenantName,
    subject: (raw.subject as string) || '',
    status: (raw.status as SupportTicket['status']) || 'open',
    priority: (priority === 'medium' ? 'normal' : priority) as SupportTicket['priority'],
    category: (raw.category as string) || '',
    createdAt: (raw.createdAt as string) || '',
    updatedAt: (raw.updatedAt as string) || '',
    messages: messages.map(mapMessage),
    assignedTo: assignedName || undefined,
  };
}
