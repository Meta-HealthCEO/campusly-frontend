'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Trophy, Dumbbell, HeartPulse, Megaphone, Pin } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShareablePlayerCard } from '@/components/sport/ShareablePlayerCard';
import { PersonalBestTable } from '@/components/sport/PersonalBestTable';
import { CareerStatsPanel } from '@/components/sport/CareerStatsPanel';
import { MatchHistoryList } from '@/components/sport/MatchHistoryList';
import { useSportStats } from '@/hooks/useSportStats';
import { useTrainingSessions } from '@/hooks/useTraining';
import { useInjuries } from '@/hooks/useInjuries';
import { useTeamAnnouncements } from '@/hooks/useTeamAnnouncements';
import { useMyStudentId } from '@/hooks/useMyStudentId';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  TRAINING_FOCUS_LABELS,
} from '@/types/training';
import {
  BODY_PART_LABELS, INJURY_TYPE_LABELS, STATUS_LABELS, CLEARANCE_LABELS,
} from '@/types/injury';
import { TEAM_PRIORITY_LABELS } from '@/types/team-announcement';
import type { CareerStats, StudentMatchEntry } from '@/types/sport';

export default function StudentSportsPage() {
  const { user } = useAuthStore();
  const studentId = user?.id ?? '';
  const { studentId: myStudentRecordId } = useMyStudentId();

  const {
    playerCards, personalBests, sportConfigs, loading,
    loadPlayerCards, loadPersonalBests, loadSportConfigs,
    getPlayerCareerStats, getStudentMatchHistory,
  } = useSportStats();

  const { sessions: trainingSessions, loading: trainingLoading } = useTrainingSessions(
    myStudentRecordId ? { studentId: myStudentRecordId } : {},
  );
  const { injuries, loading: injuriesLoading } = useInjuries(
    myStudentRecordId ? { studentId: myStudentRecordId } : {},
  );
  const { announcements, loading: announcementsLoading } = useTeamAnnouncements(
    myStudentRecordId ? { studentId: myStudentRecordId } : {},
  );

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

  const handleSportChange = useCallback((v: unknown) => {
    setSelectedSport((v as string) ?? 'all');
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
          <TabsTrigger value="training"><Dumbbell className="mr-1 h-4 w-4" />Training</TabsTrigger>
          <TabsTrigger value="injuries"><HeartPulse className="mr-1 h-4 w-4" />Injuries</TabsTrigger>
          <TabsTrigger value="news"><Megaphone className="mr-1 h-4 w-4" />Team News</TabsTrigger>
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

        <TabsContent value="training" className="mt-4">
          {trainingLoading ? (
            <LoadingSpinner />
          ) : trainingSessions.length === 0 ? (
            <EmptyState icon={Dumbbell} title="No training sessions" description="No training has been scheduled for your team yet." />
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
            <EmptyState icon={HeartPulse} title="No injuries on record" description="You have no recorded injuries." />
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
            <EmptyState icon={Megaphone} title="No team announcements" description="Your coach hasn't posted anything yet." />
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
