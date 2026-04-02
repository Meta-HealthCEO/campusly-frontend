'use client';

import { StatCard } from '@/components/shared/StatCard';
import { Send, CheckCheck, Eye, AlertCircle } from 'lucide-react';
import type { WhatsAppDeliveryStats } from '@/types/whatsapp';

interface DeliveryStatsPanelProps {
  stats: WhatsAppDeliveryStats | null;
}

export function DeliveryStatsPanel({ stats }: DeliveryStatsPanelProps) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
      <StatCard title="Sent" value={String(stats?.sent ?? 0)} icon={Send} />
      <StatCard title="Delivered" value={String(stats?.delivered ?? 0)} icon={CheckCheck} />
      <StatCard title="Read" value={String(stats?.read ?? 0)} icon={Eye} />
      <StatCard
        title="Failed"
        value={String(stats?.failed ?? 0)}
        icon={AlertCircle}
        className={stats?.failed ? 'border-destructive/30' : ''}
      />
    </div>
  );
}
