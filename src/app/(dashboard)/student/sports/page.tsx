'use client';

import { useEffect, useState, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PlayerCardDisplay } from '@/components/sport/PlayerCardDisplay';
import { PersonalBestTable } from '@/components/sport/PersonalBestTable';
import { useSportStats } from '@/hooks/useSportStats';
import { useAuthStore } from '@/stores/useAuthStore';

export default function StudentSportsPage() {
  const { user } = useAuthStore();
  const studentId = user?.id ?? '';

  const {
    playerCards, personalBests, sportConfigs, loading,
    loadPlayerCards, loadPersonalBests, loadSportConfigs,
  } = useSportStats();

  const [selectedSport, setSelectedSport] = useState('all');

  useEffect(() => {
    loadSportConfigs();
    loadPlayerCards();
  }, [loadSportConfigs, loadPlayerCards]);

  useEffect(() => {
    if (!studentId) return;
    const sportCode = selectedSport === 'all' ? undefined : selectedSport;
    loadPersonalBests(studentId, sportCode);
  }, [studentId, selectedSport, loadPersonalBests]);

  const myCards = useMemo(
    () => playerCards.filter((c) => c.studentId === studentId),
    [playerCards, studentId]
  );

  const filteredCards = useMemo(
    () => selectedSport === 'all' ? myCards : myCards.filter((c) => c.sportCode === selectedSport),
    [myCards, selectedSport]
  );

  if (loading && myCards.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sports"
        description="View your player cards and personal bests"
      />

      <Select value={selectedSport} onValueChange={(v: string | null) => setSelectedSport(v ?? 'all')}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Filter by sport" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sports</SelectItem>
          {sportConfigs.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Player cards */}
      <div>
        <h3 className="mb-3 font-semibold">My Player Cards</h3>
        {filteredCards.length === 0 ? (
          <EmptyState icon={Trophy} title="No player cards" description="You don't have any player cards yet." />
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {filteredCards.map((card) => (
              <div key={card.id} className="flex justify-center">
                <PlayerCardDisplay card={card} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personal bests */}
      <div>
        <h3 className="mb-3 font-semibold">Personal Bests</h3>
        <PersonalBestTable bests={personalBests} />
      </div>
    </div>
  );
}
