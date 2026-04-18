'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PlayerCardGrid } from '@/components/sport/PlayerCardGrid';
import { useSportStats } from '@/hooks/useSportStats';
import type { PlayerCard } from '@/types/sport';

export default function CoachPlayerCardsPage() {
  const router = useRouter();
  const { playerCards, sportConfigs, loading, loadPlayerCards, loadSportConfigs } = useSportStats();

  useEffect(() => {
    loadPlayerCards();
    loadSportConfigs();
  }, [loadPlayerCards, loadSportConfigs]);

  const handleSelect = (card: PlayerCard) => {
    const sid = typeof card.studentId === 'string'
      ? card.studentId
      : (card.studentId as { _id: string })._id;
    router.push(`/coach/player/${sid}?sport=${card.sportCode}`);
  };

  if (loading && playerCards.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Cards"
        description="FIFA FUT-style cards for your athletes"
      />
      <PlayerCardGrid
        cards={playerCards}
        onSelect={handleSelect}
        sportCodes={sportConfigs.map((c) => c.code)}
      />
    </div>
  );
}
