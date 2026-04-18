'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Trophy, Sparkles, Dumbbell, HeartPulse, Megaphone, Pin } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { useTrainingSessions } from '@/hooks/useTraining';
import { useInjuries } from '@/hooks/useInjuries';
import { useTeamAnnouncements } from '@/hooks/useTeamAnnouncements';
import { toast } from 'sonner';
import { TRAINING_FOCUS_LABELS } from '@/types/training';
import {
  BODY_PART_LABELS, INJURY_TYPE_LABELS, STATUS_LABELS, CLEARANCE_LABELS,
} from '@/types/injury';
import { TEAM_PRIORITY_LABELS } from '@/types/team-announcement';
import type { CareerStats } from '@/types/sport';

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

  const childFilter = selectedChildId ? { studentId: selectedChildId } : {};
  const { sessions: trainingSessions, loading: trainingLoading } = useTrainingSessions(childFilter);
  const { injuries, loading: injuriesLoading } = useInjuries(childFilter);
  const { announcements, loading: announcementsLoading } = useTeamAnnouncements(childFilter);

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
        <Select value={selectedChildId} onValueChange={(v: unknown) => setSelectedChildId((v as string) ?? '')}>
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

        <Select value={selectedSport} onValueChange={(v: unknown) => setSelectedSport((v as string) ?? 'all')}>
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
          <TabsTrigger value="training"><Dumbbell className="mr-1 h-4 w-4" />Training</TabsTrigger>
          <TabsTrigger value="injuries"><HeartPulse className="mr-1 h-4 w-4" />Injuries</TabsTrigger>
          <TabsTrigger value="news"><Megaphone className="mr-1 h-4 w-4" />Team News</TabsTrigger>
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

        <TabsContent value="training" className="mt-4">
          {trainingLoading ? (
            <LoadingSpinner />
          ) : trainingSessions.length === 0 ? (
            <EmptyState icon={Dumbbell} title="No training sessions" description="No training scheduled for this child's team yet." />
          ) : (
            <div className="grid gap-3">
              {trainingSessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{s.title}</h3>
                      <Badge variant="secondary">{s.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(s.date).toLocaleDateString()} · {s.startTime} · {s.durationMinutes} min
                      {s.location ? ` · ${s.location}` : ''}
                    </p>
                    {s.focus.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {s.focus.map((f) => (
                          <Badge key={f} variant="outline" className="text-xs">
                            {TRAINING_FOCUS_LABELS[f]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="injuries" className="mt-4">
          {injuriesLoading ? (
            <LoadingSpinner />
          ) : injuries.length === 0 ? (
            <EmptyState icon={HeartPulse} title="No injuries on record" description="No recorded injuries for this child." />
          ) : (
            <div className="grid gap-3">
              {injuries.map((i) => (
                <Card key={i.id}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {BODY_PART_LABELS[i.bodyPart]} · {INJURY_TYPE_LABELS[i.type]}
                      </p>
                      <Badge variant={i.status === 'active' ? 'destructive' : 'secondary'}>
                        {STATUS_LABELS[i.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Injured {new Date(i.injuryDate).toLocaleDateString()}
                      {i.expectedReturnDate && ` · Expected back ${new Date(i.expectedReturnDate).toLocaleDateString()}`}
                    </p>
                    {i.clearanceLevel !== 'none' && (
                      <Badge variant="outline" className="text-xs">{CLEARANCE_LABELS[i.clearanceLevel]}</Badge>
                    )}
                    {i.description && <p className="text-sm">{i.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          {announcementsLoading ? (
            <LoadingSpinner />
          ) : announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="No team announcements" description="The coach hasn't posted anything yet." />
          ) : (
            <div className="grid gap-3">
              {announcements.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Pin className="h-4 w-4 text-primary" />}
                      <h3 className="font-semibold truncate">{a.title}</h3>
                      <Badge variant={a.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {TEAM_PRIORITY_LABELS[a.priority]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.publishedAt).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{a.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
