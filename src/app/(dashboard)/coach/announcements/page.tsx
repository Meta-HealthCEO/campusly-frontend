'use client';

import { useState } from 'react';
import { Plus, Megaphone, Pencil, Trash2, Pin } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { AnnouncementFormDialog } from '@/components/sport/AnnouncementFormDialog';
import { useTeams } from '@/hooks/useSport';
import {
  useTeamAnnouncements, deleteTeamAnnouncement,
} from '@/hooks/useTeamAnnouncements';
import {
  TEAM_PRIORITY_LABELS,
  type TeamAnnouncement,
  type TeamAnnouncementPriority,
} from '@/types/team-announcement';

function teamLabel(team: TeamAnnouncement['teamId']): string {
  if (typeof team === 'string') return 'Team';
  return `${team.name} · ${team.sport}`;
}

function priorityVariant(
  p: TeamAnnouncementPriority,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (p === 'urgent') return 'destructive';
  if (p === 'high') return 'default';
  if (p === 'low') return 'outline';
  return 'secondary';
}

export default function CoachAnnouncementsPage() {
  const { teams } = useTeams();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const filters = teamFilter !== 'all' ? { teamId: teamFilter } : {};
  const { announcements, loading, refetch } = useTeamAnnouncements(filters);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamAnnouncement | null>(null);

  function openCreate() {
    if (teams.length === 0) return;
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(a: TeamAnnouncement) {
    setEditing(a);
    setFormOpen(true);
  }

  async function handleDelete(a: TeamAnnouncement) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try { await deleteTeamAnnouncement(a.id); await refetch(); } catch { /* toasted */ }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Publish updates to teams, parents, and players">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={teamFilter} onValueChange={(v: unknown) => setTeamFilter(v as string)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} disabled={teams.length === 0}>
            <Plus className="mr-1 h-4 w-4" />
            New announcement
          </Button>
        </div>
      </PageHeader>

      {loading && announcements.length === 0 ? (
        <LoadingSpinner />
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description={teams.length === 0 ? 'Create a team first to publish announcements.' : 'Publish your first announcement to get the word out.'}
        />
      ) : (
        <div className="grid gap-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.pinned && <Pin className="h-4 w-4 text-primary" />}
                      <h3 className="font-semibold truncate">{a.title}</h3>
                      <Badge variant={priorityVariant(a.priority)}>{TEAM_PRIORITY_LABELS[a.priority]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {teamLabel(a.teamId)} · {new Date(a.publishedAt).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{a.body}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(a)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teams={teams}
        announcement={editing}
        onSuccess={refetch}
      />
    </div>
  );
}
