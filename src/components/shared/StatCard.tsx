'use client';

import { Card, CardContent } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  description?: string;
  trend?: { value: number; label: string };
  /** Teacher portal: attention for something waiting on the teacher, success for good news. */
  tone?: 'default' | 'attention' | 'success';
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, tone = 'default', className }: StatCardProps) {
  return (
    <Card className={cn(tone === 'attention' && 'teacher:border-attention/40 teacher:bg-attention-soft/40', className)}>
      <CardContent className="p-6 teacher:p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn(
              'truncate text-2xl font-bold teacher:font-mono teacher:font-medium teacher:tracking-tight',
              tone === 'attention' && 'teacher:text-attention',
              tone === 'success' && 'teacher:text-success',
            )}>
              {value}
            </p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <p className={cn('text-xs font-medium', trend.value >= 0 ? 'text-success' : 'text-destructive')}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-xl bg-primary/10 p-3 teacher:bg-accent-soft">
              <Icon className="h-6 w-6 text-primary teacher:text-accent" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
