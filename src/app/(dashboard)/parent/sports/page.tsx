'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlayerCardDisplay } from '@/components/sport/PlayerCardDisplay';
import { PersonalBestTable } from '@/components/sport/PersonalBestTable';
import { CareerStatsPanel } from '@/components/sport/CareerStatsPanel';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useSportStats } from '@/hooks/useSportStats';
import { toast } from 'sonner';
import type { CareerStats, ParentSportsReport } from '@/types/sport';

export default function ParentSportsPage() {
  const { children, loading: parentLoading } = useCurrentParent();

  const {
    playerCards, personalBests, sportConfigs, loading,
    loadSportConfigs, loadPlayerCardsByStudent, loadPersonalBests,
    getPlayerCareerStats, getParentSportsReport,
  } = useSportStats();

  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Set default child once loaded
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  useEffect(() => {
    loadSportConfigs();
  }, [loadSportConfigs]);

  // Load cards + PBs when child/sport changes
  useEffect(() => {
    if (!selectedChildId) return;
    const sportCode = selectedSport === 'all' ? undefined : selectedSport;
    loadPlayerCardsByStudent(selectedChildId, sportCode);
    loadPersonalBests(selectedChildId, sportCode);
    setCareerStats(null);
  }, [selectedChildId, selectedSport, loadPlayerCardsByStudent, loadPersonalBests]);

  const filteredCards = useMemo(
    () => selectedSport === 'all'
      ? playerCards
      : playerCards.filter((c) => c.sportCode === selectedSport),
    [playerCards, selectedSport]
  );

  const handleTabChange = useCallback(async (val: unknown) => {
    const tab = val as string;
    if (tab === 'stats' && selectedChildId && selectedSport !== 'all') {
      setStatsLoading(true);
      const data = await getPlayerCareerStats(selectedChildId, selectedSport);
      setCareerStats(data);
      setStatsLoading(false);
    }
  }, [selectedChildId, selectedSport, getPlayerCareerStats]);

  const handleAIReport = useCallback(async () => {
    if (!selectedChildId) return;
    setReportLoading(true);
    const report = await getParentSportsReport(selectedChildId);
    setReportLoading(false);
    if (report) {
      toast.success('AI report generated! Check your inbox or the report section.');
    } else {
      toast.error('Failed to generate AI sports report');
    }
  }, [selectedChildId, getParentSportsReport]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId),
    [children, selectedChildId]
  );

  if (parentLoading) return <LoadingSpinner />;

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sports" description="View your child's sports performance" />
        <EmptyState icon={Trophy} title="No children linked" description="No children are linked to your account." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sports"
        description={selectedChild ? `${selectedChild.firstName}'s sports overview` : 'View sports performance'}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={selectedChildId} onValueChange={(v: string | null) => setSelectedChildId(v ?? '')}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Select child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((child) => (
              <SelectItem key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Button
          variant="outline"
          className="gap-2 w-full sm:w-auto"
          onClick={handleAIReport}
          disabled={reportLoading || !selectedChildId}
        >
          <Sparkles className="h-4 w-4" />
          {reportLoading ? 'Generating...' : 'Get AI Analysis'}
        </Button>
      </div>

      <Tabs defaultValue="cards" onValueChange={handleTabChange}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="cards">Player Cards</TabsTrigger>
          <TabsTrigger value="stats">Career Stats</TabsTrigger>
          <TabsTrigger value="bests">Personal Bests</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          {loading ? (
            <LoadingSpinner />
          ) : filteredCards.length === 0 ? (
            <EmptyState icon={Trophy} title="No player cards" description="No player cards found for this child." />
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {filteredCards.map((card) => (
                <div key={card.id} className="flex justify-center">
                  <PlayerCardDisplay card={card} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {selectedSport === 'all' ? (
            <EmptyState icon={Trophy} title="Select a sport" description="Choose a specific sport to view career statistics." />
          ) : (
            <CareerStatsPanel careerStats={careerStats} loading={statsLoading} />
          )}
        </TabsContent>

        <TabsContent value="bests" className="mt-4">
          {loading ? <LoadingSpinner /> : <PersonalBestTable bests={personalBests} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
