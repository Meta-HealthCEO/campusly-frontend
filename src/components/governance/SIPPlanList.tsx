'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList, Pencil, Trash2 } from 'lucide-react';
import type { SIPPlan, SIPStatus } from '@/types';

interface SIPPlanListProps {
  plans: SIPPlan[];
  onSelect: (id: string) => void;
  onEdit?: (plan: SIPPlan) => void;
  onDelete?: (id: string) => void;
}

const STATUS_VARIANTS: Record<SIPStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  completed: 'outline',
  archived: 'outline',
};

const STATUS_LABELS: Record<SIPStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SIPPlanList({ plans, onSelect, onEdit, onDelete }: SIPPlanListProps) {
  if (plans.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No SIP plans found"
        description="Create your first School Improvement Plan to get started."
      />
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className="cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onSelect(plan.id)}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium truncate flex-1">{plan.title}</h3>
              <Badge variant={STATUS_VARIANTS[plan.status]}>{STATUS_LABELS[plan.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Year: {plan.year}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(plan.startDate)} — {formatDate(plan.endDate)}
            </p>
            {(onEdit || onDelete) && (
              <div
                className="flex items-center gap-2 pt-1"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(plan)}
                    aria-label="Edit plan"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(plan.id)}
                    aria-label="Delete plan"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
