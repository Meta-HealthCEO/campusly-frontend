'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Trophy } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShareablePlayerCard } from '@/components/sport/ShareablePlayerCard';
import { PersonalBestTable } from '@/components/sport/PersonalBestTable';
import { CareerStatsPanel } from '@/components/sport/CareerStatsPanel';
import { MatchHistoryList } from '@/components/sport/MatchHistoryList';
import { useSportStats } from '@/hooks/useSportStats';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CareerStats, StudentMatchEntry } from '@/types/sport';

export default function StudentSportsPage() {
  const { user } = useAuthStore();
  const studentId = user?.id ?? '';

  const {
    playerCards, personalBests, sportConfigs, loading,
    loadPlayerCards, loadPersonalBests, loadSportConfigs,
    getPlayerCareerStats, getStudentMatchHistory,
  } = useSportStats();

  const [selectedSport, setSelectedSport] = useState('all');
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [matches, setMatches] = useState<StudentMatchEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => {
    loadSportConfigs();
    loadPlayerCards();
  }, [loadSportConfigs, loadPlayerCards]);

  useEffect(() => {
    if (!studentId) return;
    const sportCode = selectedSport === 'all' ? undefined : selectedSport;
    loadPersonalBests(studentId, sportCode);
  }, [studentId, selectedSport, loadPersonalBests]);

  const loadCareerStats = useCallback(async (sportCode: string) => {
    if (!studentId || sportCode === 'all') {
      setCareerStats(null);
      return;
    }
    setStatsLoading(true);
    const data = await getPlayerCareerStats(studentId, sportCode);
    setCareerStats(data);
    setStatsLoading(false);
  }, [studentId, getPlayerCareerStats]);

  const loadMatchHistory = useCallback(async (sportCode: string) => {
    if (!studentId || sportCode === 'all') {
      setMatches([]);
      return;
    }
    setMatchesLoading(true);
    const data = await getStudentMatchHistory(studentId, sportCode);
    setMatches(data);
    setMatchesLoading(false);
  }, [studentId, getStudentMatchHistory]);

  const myCards = useMemo(
    () => playerCards.filter((c) => c.studentId === studentId),
    [playerCards, studentId]
  );

  const filteredCards = useMemo(
    () => selectedSport === 'all' ? myCards : myCards.filter((c) => c.sportCode === selectedSport),
    [myCards, selectedSport]
  );

  const handleTabChange = useCallback((val: unknown) => {
    const tab = val as string;
    if (tab === 'stats') loadCareerStats(selectedSport);
    if (tab === 'history') loadMatchHistory(selectedSport);
  }, [selectedSport, loadCareerStats, loadMatchHistory]);

  const handleSportChange = useCallback((v: string | null) => {
    setSelectedSport(v ?? 'all');
    setCareerStats(null);
    setMatches([]);
  }, []);

  if (loading && myCards.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sports"
        description="View your player cards, career stats, match history and personal bests"
      />

      <Select value={selectedSport} onValueChange={handleSportChange}>
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

      <Tabs defaultValue="cards" onValueChange={handleTabChange}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="cards">My Cards</TabsTrigger>
          <TabsTrigger value="stats">Career Stats</TabsTrigger>
          <TabsTrigger value="history">Match History</TabsTrigger>
          <TabsTrigger value="bests">Personal Bests</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          {filteredCards.length === 0 ? (
            <EmptyState icon={Trophy} title="No player cards" description="You don't have any player cards yet." />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCards.map((card) => (
                <div key={card.id} className="flex justify-center">
                  <ShareablePlayerCard
                    card={card}
                    studentName={card.studentName ?? user?.firstName ?? 'Player'}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {selectedSport === 'all' ? (
            <EmptyState
              icon={Trophy}
              title="Select a sport"
              description="Choose a specific sport above to view career statistics."
            />
          ) : (
            <CareerStatsPanel careerStats={careerStats} loading={statsLoading} />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {selectedSport === 'all' ? (
            <EmptyState
              icon={Trophy}
              title="Select a sport"
              description="Choose a specific sport above to view match history."
            />
          ) : (
            <MatchHistoryList matches={matches} loading={matchesLoading} />
          )}
        </TabsContent>

        <TabsContent value="bests" className="mt-4">
          <PersonalBestTable bests={personalBests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
