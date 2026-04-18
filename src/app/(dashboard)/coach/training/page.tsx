'use client';

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { TrainingSessionFormDialog } from '@/components/sport/TrainingSessionFormDialog';
import { TrainingAttendancePanel } from '@/components/sport/TrainingAttendancePanel';
import { useTeams } from '@/hooks/useSport';
import {
  useTrainingSessions, deleteTrainingSession,
} from '@/hooks/useTraining';
import {
  TRAINING_FOCUS_LABELS,
  type TrainingSession,
} from '@/types/training';
import type { SportPlayer, SportTeam } from '@/types/sport';

function getTeamId(
  teamId: TrainingSession['teamId'],
): string {
  return typeof teamId === 'string' ? teamId : teamId._id;
}

function getTeamLabel(teamId: TrainingSession['teamId']): string {
  if (typeof teamId === 'string') return 'Team';
  return `${teamId.name} · ${teamId.sport}`;
}

function statusBadgeVariant(
  status: TrainingSession['status'],
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'completed') return 'default';
  if (status === 'cancelled') return 'destructive';
  return 'secondary';
}

export default function CoachTrainingPage() {
  const { teams, loading: teamsLoading } = useTeams();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const params = teamFilter !== 'all' ? { teamId: teamFilter } : {};
  const { sessions, loading, refetch } = useTrainingSessions(params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingSession | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<TrainingSession | null>(null);

  const teamsById = useMemo(() => {
    const map = new Map<string, SportTeam>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const attendancePlayers: SportPlayer[] = useMemo(() => {
    if (!attendanceSession) return [];
    const team = teamsById.get(getTeamId(attendanceSession.teamId));
    return team?.playerIds ?? [];
  }, [attendanceSession, teamsById]);

  function openCreate() {
    if (teams.length === 0) {
      toast.error('Create a team before scheduling training');
      return;
    }
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(session: TrainingSession) {
    setEditing(session);
    setFormOpen(true);
  }

  async function handleDelete(session: TrainingSession) {
    if (!confirm(`Delete "${session.title}"? This cannot be undone.`)) return;
    try {
      await deleteTrainingSession(session.id);
      await refetch();
    } catch {
      // toast handled in hook
    }
  }

  const showLoading = (loading || teamsLoading) && sessions.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Training" description="Schedule sessions, track attendance, rate performance">
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
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            New session
          </Button>
        </div>
      </PageHeader>

      {showLoading ? (
        <LoadingSpinner />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No training sessions yet"
          description={teams.length === 0 ? 'Create a team first, then schedule your first session.' : 'Schedule your first training session to get started.'}
        />
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{s.title}</h3>
                      <Badge variant={statusBadgeVariant(s.status)}>
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(s.date).toLocaleDateString()} · {s.startTime} · {s.durationMinutes} min
                      {s.location ? ` · ${s.location}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getTeamLabel(s.teamId)}
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
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAttendanceSession(s)}
                    >
                      <Users className="mr-1 h-4 w-4" />
                      Attendance
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(s)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TrainingSessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teams={teams}
        session={editing}
        onSuccess={refetch}
      />

      <Dialog
        open={!!attendanceSession}
        onOpenChange={(o) => !o && setAttendanceSession(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attendance · {attendanceSession?.title}</DialogTitle>
            <DialogDescription>
              {attendanceSession
                ? `${new Date(attendanceSession.date).toLocaleDateString()} · ${attendanceSession.startTime}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {attendanceSession && (
              <TrainingAttendancePanel
                sessionId={attendanceSession.id}
                players={attendancePlayers}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
