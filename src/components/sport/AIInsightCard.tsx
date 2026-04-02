'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Lightbulb, Star,
} from 'lucide-react';
import type { AIInsight, InsightCategory } from '@/types/ai-sports';
import type { LucideIcon } from 'lucide-react';

interface AIInsightCardProps {
  insight: AIInsight;
}

const CATEGORY_CONFIG: Record<InsightCategory, { icon: LucideIcon; color: string }> = {
  strength: { icon: TrendingUp, color: 'text-emerald-600 bg-emerald-500/10' },
  weakness: { icon: TrendingDown, color: 'text-amber-600 bg-amber-500/10' },
  trend: { icon: ArrowRight, color: 'text-blue-600 bg-blue-500/10' },
  risk: { icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
  recommendation: { icon: Lightbulb, color: 'text-purple-600 bg-purple-500/10' },
  talent_flag: { icon: Star, color: 'text-yellow-600 bg-yellow-500/10' },
};

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

export function AIInsightCard({ insight }: AIInsightCardProps) {
  const cfg = CATEGORY_CONFIG[insight.category];
  const Icon = cfg.icon;
  const [iconColor, bgColor] = cfg.color.split(' ');

  return (
    <Card>
      <CardContent className="flex gap-3 p-4">
        <div className={`rounded-lg p-2 shrink-0 self-start ${bgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate">{insight.title}</h4>
            <Badge variant={PRIORITY_VARIANT[insight.priority] ?? 'outline'} className="shrink-0">
              {insight.priority}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">{insight.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
