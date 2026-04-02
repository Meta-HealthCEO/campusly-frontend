'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { BadgeDefinition, BadgeEarned } from '@/types';

interface BadgeGridProps {
  badgeDefinitions: BadgeDefinition[];
  earnedBadges: BadgeEarned[];
}

export function BadgeGrid({ badgeDefinitions, earnedBadges }: BadgeGridProps) {
  const earnedIds = useMemo(
    () => new Set(earnedBadges.map((b) => b.badgeId)),
    [earnedBadges],
  );

  if (badgeDefinitions.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Badges</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={Award} title="No Badges" description="Badge definitions have not been set up yet." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Badges</CardTitle>
          <Badge variant="secondary">{earnedBadges.length}/{badgeDefinitions.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delay={200}>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {badgeDefinitions.map((badge) => {
              const earned = earnedIds.has(badge.id);
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger
                    render={
                      <div className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors cursor-default ${
                        earned ? 'bg-primary/5 border-primary/30' : 'opacity-40 grayscale border-dashed'
                      }`}>
                        <span className="text-2xl">{badge.icon}</span>
                        <span className="text-xs font-medium truncate w-full">{badge.name}</span>
                        <span className="text-[10px] text-muted-foreground">+{badge.xpReward} XP</span>
                      </div>
                    }
                  />
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-semibold text-sm">{badge.name}</p>
                    <p className="text-xs">{badge.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{badge.criteria}</p>
                    {earned && (
                      <p className="text-xs text-primary mt-1 font-medium">Earned!</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
