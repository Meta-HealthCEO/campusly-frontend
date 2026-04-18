'use client';

import Link from 'next/link';
import { Trophy, Users, Calendar, BarChart3, ClipboardList, Award, Sparkles, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { useTeams, useFixtures, useSeasons } from '@/hooks/useSport';
import { useAuthStore } from '@/stores/useAuthStore';
import { ROUTES } from '@/lib/constants';

export default function CoachDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { teams, loading: teamsLoading } = useTeams();
  const { fixtures, loading: fixturesLoading } = useFixtures();
  const { seasons } = useSeasons();

  const activeTeams = teams.filter((t) => t.isActive).length;
  const upcomingFixtures = fixtures
    .filter((f) => new Date(f.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
  const activeSeasons = seasons.filter((s) => s.isActive).length;
  const totalPlayers = teams.reduce((sum, t) => sum + (t.playerIds?.length ?? 0), 0);

  const loading = teamsLoading || fixturesLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user ? `Welcome back, ${user.firstName}` : 'Coach dashboard'}
        description="Your teams, fixtures, and performance at a glance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Teams" value={String(activeTeams)} icon={Users} />
        <StatCard title="Upcoming Fixtures" value={String(upcomingFixtures.length)} icon={Calendar} />
        <StatCard title="Active Seasons" value={String(activeSeasons)} icon={BarChart3} />
        <StatCard title="Total Players" value={String(totalPlayers)} icon={Trophy} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Upcoming fixtures</h3>
              <Link href={ROUTES.COACH_FIXTURES} className="text-sm text-primary hover:underline">
                See all
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : upcomingFixtures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming fixtures scheduled.</p>
            ) : (
              <ul className="divide-y">
                {upcomingFixtures.map((f) => (
                  <li key={f.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">vs {f.opponent}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(f.date).toLocaleDateString()} · {f.time} · {f.venue}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <h3 className="mb-4 text-lg font-semibold">Quick actions</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickAction href={ROUTES.COACH_TEAMS} icon={Users} label="Manage teams" />
              <QuickAction href={ROUTES.COACH_FIXTURES} icon={Calendar} label="Schedule fixture" />
              <QuickAction href={ROUTES.COACH_RESULTS} icon={ClipboardList} label="Record result" />
              <QuickAction href={ROUTES.COACH_PLAYER_CARDS} icon={Award} label="Player cards" />
              <QuickAction href={ROUTES.COACH_AI_ANALYTICS} icon={Sparkles} label="AI analytics" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-accent"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="truncate text-sm font-medium">{label}</span>
    </Link>
  );
}
