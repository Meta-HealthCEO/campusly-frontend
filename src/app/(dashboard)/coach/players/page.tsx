'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useTeams } from '@/hooks/useSport';
import type { SportPlayer, SportTeam } from '@/types/sport';

interface FlatPlayer {
  studentId: string;
  name: string;
  team: SportTeam;
}

function playerName(p: SportPlayer): string {
  if (p.firstName || p.lastName) return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  return 'Unknown';
}

export default function CoachPlayersPage() {
  const { teams, loading } = useTeams();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const allPlayers = useMemo(() => {
    const flat: FlatPlayer[] = [];
    const seen = new Set<string>();
    for (const team of teams) {
      for (const p of team.playerIds ?? []) {
        const key = `${team.id}::${p._id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        flat.push({ studentId: p._id, name: playerName(p), team });
      }
    }
    return flat;
  }, [teams]);

  const filtered = useMemo(() => {
    let list = allPlayers;
    if (teamFilter !== 'all') list = list.filter((p) => p.team.id === teamFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allPlayers, teamFilter, search]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Players" description={`${allPlayers.length} athletes across all teams`}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          <Select value={teamFilter} onValueChange={(v: unknown) => setTeamFilter(v as string)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No players found"
          description={search ? 'Try a different search.' : 'Add players to a team to see them here.'}
        />
      ) : (
        <div className="grid gap-2">
          {filtered.map((p) => {
            const sport = p.team.sport.toLowerCase();
            return (
              <Link
                key={`${p.team.id}-${p.studentId}`}
                href={`/coach/player/${p.studentId}?sport=${sport}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">{p.team.name}</Badge>
                        <Badge variant="secondary" className="text-xs">{p.team.sport}</Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
