'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CampaignProgressBar } from './CampaignProgressBar';
import { ShareCampaignButton } from './ShareCampaignButton';
import { formatDate } from '@/lib/utils';
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{campaign.title}</CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className={statusStyles[status] ?? ''}>
              {status}
            </Badge>
            <ShareCampaignButton campaignTitle={campaign.title} campaignId={campaign.id} />
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
        <CampaignProgressBar
          targetAmount={campaign.targetAmount}
          raisedAmount={campaign.raisedAmount}
        />
        <div className="text-xs text-muted-foreground text-right">
          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
        </div>
      </CardContent>
    </Card>
  );
}
