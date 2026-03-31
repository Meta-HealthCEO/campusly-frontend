'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Campaign } from '@/hooks/useFundraising';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-gray-100 text-gray-500',
  completed: 'bg-gray-100 text-gray-500',
  upcoming: 'bg-blue-100 text-blue-800',
};

function getStatus(c: Campaign): string {
  if (!c.isActive) return 'inactive';
  const now = new Date();
  if (new Date(c.endDate) < now) return 'completed';
  if (new Date(c.startDate) > now) return 'upcoming';
  return 'active';
}

interface CampaignCardProps {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
}

export function CampaignCard({ campaign, onEdit, onDelete }: CampaignCardProps) {
  const status = getStatus(campaign);
  const progress = campaign.targetAmount > 0
    ? Math.min(Math.round((campaign.raisedAmount / campaign.targetAmount) * 100), 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{campaign.title}</CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className={statusStyles[status] ?? ''}>
              {status}
            </Badge>
            <Button size="xs" variant="ghost" onClick={() => onEdit(campaign)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="xs" variant="ghost" onClick={() => onDelete(campaign.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {campaign.description && <CardDescription>{campaign.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Raised: <span className="font-medium text-foreground">{formatCurrency(campaign.raisedAmount)}</span>
          </span>
          <span className="text-muted-foreground">
            Target: <span className="font-medium text-foreground">{formatCurrency(campaign.targetAmount)}</span>
          </span>
        </div>
        <Progress value={progress} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% funded</span>
          <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
