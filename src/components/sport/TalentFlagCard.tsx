'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Check, X } from 'lucide-react';
import type { TalentFlag, TalentFlagStatus, TalentLevel } from '@/types/ai-sports';

interface TalentFlagCardProps {
  flag: TalentFlag;
  onReview?: (id: string, status: TalentFlagStatus) => void;
}

const LEVEL_CONFIG: Record<TalentLevel, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  school: { label: 'School', variant: 'outline' },
  district: { label: 'District', variant: 'secondary' },
  provincial: { label: 'Provincial', variant: 'default' },
  national: { label: 'National', variant: 'default' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TalentFlagCard({ flag, onReview }: TalentFlagCardProps) {
  const levelCfg = LEVEL_CONFIG[flag.level];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Star className="h-4 w-4 text-yellow-500 shrink-0" />
            <h4 className="font-medium truncate">{flag.studentName ?? 'Unknown Player'}</h4>
          </div>
          <Badge variant={levelCfg.variant}>{levelCfg.label}</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{flag.sportCode}</Badge>
          <span>{formatDate(flag.flaggedAt)}</span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">{flag.reasoning}</p>

        {flag.status === 'flagged' && onReview && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => onReview(flag.id, 'confirmed')}>
              <Check className="mr-1 h-3 w-3" /> Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReview(flag.id, 'dismissed')}>
              <X className="mr-1 h-3 w-3" /> Dismiss
            </Button>
          </div>
        )}

        {flag.status !== 'flagged' && (
          <Badge variant={flag.status === 'confirmed' ? 'default' : 'secondary'}>
            {flag.status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
