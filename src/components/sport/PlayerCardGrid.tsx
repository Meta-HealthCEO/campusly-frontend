'use client';

import { useMemo, useState } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PlayerCardDisplay } from './PlayerCardDisplay';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy } from 'lucide-react';
import type { PlayerCard } from '@/types/sport';

interface PlayerCardGridProps {
  cards: PlayerCard[];
  onSelect: (card: PlayerCard) => void;
  sportCodes?: string[];
}

export function PlayerCardGrid({ cards, onSelect, sportCodes = [] }: PlayerCardGridProps) {
  const [sportFilter, setSportFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating');

  const uniqueSports = useMemo(() => {
    if (sportCodes.length > 0) return sportCodes;
    return [...new Set(cards.map((c) => c.sportCode))];
  }, [cards, sportCodes]);

  const filtered = useMemo(() => {
    let list = sportFilter === 'all' ? cards : cards.filter((c) => c.sportCode === sportFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === 'rating') return b.overallRating - a.overallRating;
      return (a.studentName ?? '').localeCompare(b.studentName ?? '');
    });
    return list;
  }, [cards, sportFilter, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={sportFilter} onValueChange={(v: string | null) => setSportFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {uniqueSports.map((code) => (
              <SelectItem key={code} value={code}>{code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: string | null) => setSortBy((v ?? 'rating') as 'rating' | 'name')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Highest Rating</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Trophy} title="No player cards" description="No cards match the current filter." />
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((card) => (
            <button key={card.id} type="button" onClick={() => onSelect(card)} className="flex justify-center">
              <PlayerCardDisplay card={card} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
