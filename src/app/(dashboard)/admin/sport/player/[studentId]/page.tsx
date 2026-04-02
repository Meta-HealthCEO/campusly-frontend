'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlayerCardDisplay } from '@/components/sport/PlayerCardDisplay';
import { PersonalBestTable } from '@/components/sport/PersonalBestTable';
import { RecordPersonalBestDialog } from '@/components/sport/RecordPersonalBestDialog';
import { useSportStats } from '@/hooks/useSportStats';
import type { RecordPersonalBestPayload } from '@/types/sport';

export default function PlayerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.studentId as string;
  const initialSport = searchParams.get('sport') ?? '';

  const {
    playerCard, personalBests, sportConfigs, loading,
    loadPlayerCard, loadPersonalBests, loadSportConfigs,
    recordPersonalBest, recalculateCard,
  } = useSportStats();

  const [activeSport, setActiveSport] = useState(initialSport);
  const [pbDialogOpen, setPbDialogOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => { loadSportConfigs(); }, [loadSportConfigs]);

  useEffect(() => {
    if (!studentId || !activeSport) return;
    loadPlayerCard(studentId, activeSport);
    loadPersonalBests(studentId, activeSport);
  }, [studentId, activeSport, loadPlayerCard, loadPersonalBests]);

  // Set initial sport from configs if not provided
  useEffect(() => {
    if (!activeSport && sportConfigs.length > 0) {
      setActiveSport(sportConfigs[0].code);
    }
  }, [activeSport, sportConfigs]);

  const handleRecalculate = useCallback(async () => {
    if (!activeSport) return;
    try {
      setRecalculating(true);
      await recalculateCard(studentId, activeSport);
      loadPlayerCard(studentId, activeSport);
    } catch (err: unknown) {
      toast.error('Failed to recalculate card');
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  }, [studentId, activeSport, recalculateCard, loadPlayerCard]);

  const handleRecordPB = useCallback(async (payload: RecordPersonalBestPayload) => {
    await recordPersonalBest(studentId, payload);
    loadPersonalBests(studentId, activeSport);
  }, [studentId, activeSport, recordPersonalBest, loadPersonalBests]);

  if (loading && !playerCard) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={playerCard?.studentName ?? 'Player Profile'}
        description="Player card, personal bests, and career statistics"
      />

      {/* Sport tabs */}
      {sportConfigs.length > 1 && (
        <Tabs value={activeSport} onValueChange={setActiveSport}>
          <TabsList className="flex-wrap">
            {sportConfigs.map((c) => (
              <TabsTrigger key={c.code} value={c.code}>{c.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Player card */}
        <div className="flex flex-col items-center gap-4">
          {playerCard ? (
            <PlayerCardDisplay card={playerCard} />
          ) : (
            <p className="text-sm text-muted-foreground">No card available for this sport.</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculating || !activeSport}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            Recalculate Card
          </Button>
        </div>

        {/* Personal bests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Personal Bests</h3>
            <Button size="sm" onClick={() => setPbDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Record PB
            </Button>
          </div>
          <PersonalBestTable bests={personalBests} />
        </div>
      </div>

      <RecordPersonalBestDialog
        open={pbDialogOpen}
        onOpenChange={setPbDialogOpen}
        sportCode={activeSport}
        onSubmit={handleRecordPB}
      />
    </div>
  );
}
