'use client';

import { Badge } from '@/components/ui/badge';

const typeStyles: Record<string, string> = {
  message: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  announcement: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  alert: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  fee_reminder: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  absence: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  event: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  emergency: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  urgent: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
};

const channelStyles: Record<string, string> = {
  email: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  sms: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  whatsapp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  all: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  queued: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  sending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400',
  read: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <Badge className={typeStyles[type] ?? ''}>{capitalize(type)}</Badge>
  );
}

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <Badge className={priorityStyles[priority] ?? ''}>{capitalize(priority)}</Badge>
  );
}

interface ChannelBadgeProps {
  channel: string;
}

export function ChannelBadge({ channel }: ChannelBadgeProps) {
  return (
    <Badge className={channelStyles[channel] ?? ''}>{capitalize(channel)}</Badge>
  );
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={statusStyles[status] ?? ''}>{capitalize(status)}</Badge>
  );
}
