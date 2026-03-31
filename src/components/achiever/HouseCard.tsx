'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, Star, Trophy } from 'lucide-react';
import type { ApiHousePoints } from '@/hooks/useAchiever';

interface HouseCardProps {
  house: ApiHousePoints;
  rank: number;
  onAwardPoints?: () => void;
  onEdit?: () => void;
  onViewHistory?: () => void;
}

export function HouseCard({ house, rank, onAwardPoints, onEdit, onViewHistory }: HouseCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="h-2" style={{ backgroundColor: house.houseColor }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${house.houseColor}20` }}
            >
              <Trophy className="h-5 w-5" style={{ color: house.houseColor }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: house.houseColor }}>{house.houseName}</h3>
              <p className="text-xs text-muted-foreground">Rank #{rank} &middot; Term {house.term}, {house.year}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-xl font-bold">{house.totalPoints}</span>
            </div>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {onAwardPoints && (
            <Button size="sm" onClick={onAwardPoints} className="flex-1">
              <Plus className="mr-1 h-3.5 w-3.5" />Award Points
            </Button>
          )}
          {onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onViewHistory && (
            <Button size="sm" variant="outline" onClick={onViewHistory}>
              History
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
