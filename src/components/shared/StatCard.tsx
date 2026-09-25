'use client';

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  description?: string;
  trend?: { value: number; label: string };
  /** attention: something waits on the user; success: good news. */
  tone?: 'default' | 'attention' | 'success';
  className?: string;
}

/** Only where the figure is the point (spec §4). */
export function StatCard({ title, value, icon: Icon, description, trend, tone = 'default', className }: StatCardProps) {
  return (
    <Card className={cn(tone === 'attention' && 'border-attention', className)}>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('truncate font-heading text-h1 font-bold tabular-nums tracking-[-0.02em]', tone === 'attention' && 'text-attention', tone === 'success' && 'text-success')}>
              {value}
            </p>
            {description && <p className="text-caption text-muted-foreground">{description}</p>}
            {trend && (
              <p className={cn('text-caption font-semibold tabular-nums', trend.value >= 0 ? 'text-success' : 'text-destructive')}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          {Icon && (
            <div className="grid size-10 shrink-0 place-items-center rounded-control bg-muted text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
