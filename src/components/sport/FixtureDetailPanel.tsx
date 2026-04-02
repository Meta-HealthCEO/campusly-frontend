'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Home, Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFixtureResult, useAvailability, useMvpVotes } from '@/hooks/useSport';
import { useSportStats } from '@/hooks/useSportStats';
import { AvailabilityPanel } from './AvailabilityPanel';
import { MvpVotePanel } from './MvpVotePanel';
import { ResultFormDialog } from './ResultFormDialog';
import { MatchStatsView } from './MatchStatsView';
import { StatEntryForm } from './StatEntryForm';
import type { SportFixture, SportTeamRef, SportPlayer, RecordMatchStatsPayload } from '@/types/sport';

interface FixtureDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixture: SportFixture | null;
  schoolId: string;
  players: SportPlayer[];
  onResultSaved: () => void;
}

function getTeamName(teamId: SportTeamRef | string): string {
  if (typeof teamId === 'string') return teamId;
  return teamId.name ?? 'Unknown';
}

function formatDate(d: string): string {
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

export function FixtureDetailPanel({
  open, onOpenChange, fixture, schoolId, players, onResultSaved,
}: FixtureDetailPanelProps) {
  const fixtureId = fixture?.id ?? null;
  const { result, loading: resultLoading, refetch: refetchResult } = useFixtureResult(fixtureId);
  const { availability, loading: availLoading, refetch: refetchAvail } = useAvailability(fixtureId);
  const { votes, loading: mvpLoading, refetch: refetchMvp } = useMvpVotes(fixtureId);
  const {
    matchStats, loading: statsLoading,
    getMatchStats, recordMatchStats, getSportConfig,
  } = useSportStats();
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [sportConfig, setSportConfig] = useState<import('@/types/sport').SportCodeConfig | null>(null);
  const [showStatForm, setShowStatForm] = useState(false);
  const [statSaving, setStatSaving] = useState(false);

  // Load match stats and sport config when fixture opens
  useEffect(() => {
    if (!fixtureId) return;
    getMatchStats(fixtureId);
    const team = fixture?.teamId;
    const sportCode = typeof team === 'object' && team ? team.sport : '';
    if (sportCode) {
      getSportConfig(sportCode).then((cfg) => { if (cfg) setSportConfig(cfg); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureId]);

  const handleRecordStats = async (data: RecordMatchStatsPayload) => {
    if (!fixtureId) return;
    try {
      setStatSaving(true);
      await recordMatchStats(fixtureId, data);
      setShowStatForm(false);
      getMatchStats(fixtureId);
    } catch (err: unknown) {
      console.error('Failed to record stats', err);
    } finally {
      setStatSaving(false);
    }
  };

  if (!fixture) return null;

  function handleResultSaved() {
    refetchResult();
    onResultSaved();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getTeamName(fixture.teamId)} vs {fixture.opponent}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(fixture.date)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {fixture.time}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {fixture.venue}
              </span>
              <Badge variant="outline">
                {fixture.isHome ? (
                  <><Home className="mr-1 h-3 w-3" /> Home</>
                ) : (
                  <><Plane className="mr-1 h-3 w-3" /> Away</>
                )}
              </Badge>
            </div>
            {fixture.notes && (
              <p className="text-muted-foreground">{fixture.notes}</p>
            )}
          </div>

          {/* Score display */}
          {result && !resultLoading && (
            <div className="flex items-center justify-center gap-4 rounded-lg bg-muted/50 py-4">
              <span className="text-3xl font-bold">{result.homeScore}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-3xl font-bold">{result.awayScore}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setResultDialogOpen(true)}>
              {result ? 'Edit Result' : 'Record Result'}
            </Button>
          </div>

          <Tabs defaultValue="availability">
            <TabsList className="flex-wrap">
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="mvp">MVP Voting</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>
            <TabsContent value="availability" className="pt-4">
              <AvailabilityPanel
                fixtureId={fixture.id}
                schoolId={schoolId}
                players={players}
                availability={availability}
                loading={availLoading}
                onRefresh={refetchAvail}
              />
            </TabsContent>
            <TabsContent value="mvp" className="pt-4">
              <MvpVotePanel
                fixtureId={fixture.id}
                schoolId={schoolId}
                players={players}
                votes={votes}
                loading={mvpLoading}
                onRefresh={refetchMvp}
              />
            </TabsContent>
            <TabsContent value="stats" className="pt-4">
              {statsLoading ? (
                <p className="text-sm text-muted-foreground">Loading stats...</p>
              ) : matchStats && sportConfig ? (
                <MatchStatsView stats={matchStats} sportConfig={sportConfig} />
              ) : sportConfig && !showStatForm ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No stats recorded for this match.</p>
                  <Button variant="outline" size="sm" onClick={() => setShowStatForm(true)}>
                    Record Stats
                  </Button>
                </div>
              ) : sportConfig && showStatForm ? (
                <StatEntryForm
                  sportConfig={sportConfig}
                  players={players.map((p) => ({ id: p._id, name: `${p.firstName} ${p.lastName}` }))}
                  onSubmit={handleRecordStats}
                  loading={statSaving}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Sport config not available.</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ResultFormDialog
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        schoolId={schoolId}
        fixtureId={fixture.id}
        players={players}
        existingResult={result}
        onSuccess={handleResultSaved}
      />
    </>
  );
}
