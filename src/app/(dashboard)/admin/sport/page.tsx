'use client';

import { Trophy, Users, Calendar, BarChart3, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTeams, useFixtures, useSeasons } from '@/hooks/useSport';
import { TeamsTab } from '@/components/sport/TeamsTab';
import { FixturesTab } from '@/components/sport/FixturesTab';
import { SeasonsTab } from '@/components/sport/SeasonsTab';
import { ResultsTab } from '@/components/sport/ResultsTab';

export default function AdminSportPage() {
  const { teams, loading: teamsLoading, refetch: refetchTeams, schoolId } = useTeams();
  const { fixtures, loading: fixturesLoading, refetch: refetchFixtures } = useFixtures();
  const { seasons, loading: seasonsLoading, refetch: refetchSeasons } = useSeasons();

  const activeTeams = teams.filter((t) => t.isActive).length;
  const upcomingFixtures = fixtures.filter((f) => new Date(f.date) >= new Date()).length;
  const activeSeasons = seasons.filter((s) => s.isActive).length;
  const totalPlayers = teams.reduce((sum, t) => sum + (t.playerIds?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sport"
        description="Manage teams, fixtures, seasons, results, and MVP voting"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Teams" value={String(activeTeams)} icon={Users} />
        <StatCard title="Upcoming Fixtures" value={String(upcomingFixtures)} icon={Calendar} />
        <StatCard title="Active Seasons" value={String(activeSeasons)} icon={BarChart3} />
        <StatCard title="Total Players" value={String(totalPlayers)} icon={Trophy} />
      </div>

      <Tabs defaultValue="teams">
        <TabsList className="flex-wrap">
          <TabsTrigger value="teams">
            <Users className="mr-1 h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="fixtures">
            <Calendar className="mr-1 h-4 w-4" />
            Fixtures
          </TabsTrigger>
          <TabsTrigger value="seasons">
            <BarChart3 className="mr-1 h-4 w-4" />
            Seasons
          </TabsTrigger>
          <TabsTrigger value="results">
            <ClipboardList className="mr-1 h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="pt-4">
          <TeamsTab
            teams={teams}
            loading={teamsLoading}
            schoolId={schoolId}
            onRefresh={refetchTeams}
          />
        </TabsContent>

        <TabsContent value="fixtures" className="pt-4">
          <FixturesTab
            fixtures={fixtures}
            teams={teams}
            loading={fixturesLoading}
            schoolId={schoolId}
            onRefresh={refetchFixtures}
          />
        </TabsContent>

        <TabsContent value="seasons" className="pt-4">
          <SeasonsTab
            seasons={seasons}
            loading={seasonsLoading}
            schoolId={schoolId}
            onRefresh={refetchSeasons}
          />
        </TabsContent>

        <TabsContent value="results" className="pt-4">
          <ResultsTab
            fixtures={fixtures}
            teams={teams}
            loading={fixturesLoading}
            schoolId={schoolId}
            onRefresh={refetchFixtures}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
