'use client';

import { useMemo, useState } from 'react';
import { Plus, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useTeams, useStaffList } from '@/hooks/useSport';
import {
  useCoachAssignments, createCoachAssignment, deleteCoachAssignment,
} from '@/hooks/useCoachAssignments';
import {
  COACH_ROLES, COACH_ROLE_LABELS,
  type CoachAssignment, type CoachRole,
} from '@/types/coach-assignment';

function userLabel(u: CoachAssignment['userId']): string {
  if (typeof u === 'string') return 'User';
  return `${u.firstName} ${u.lastName}${u.email ? ` · ${u.email}` : ''}`;
}

function teamLabel(t: CoachAssignment['teamId']): string {
  if (typeof t === 'string') return 'Team';
  return `${t.name} · ${t.sport}`;
}

export default function AdminCoachesPage() {
  const { teams } = useTeams();
  const { staff } = useStaffList();
  const { assignments, loading, refetch } = useCoachAssignments();

  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [role, setRole] = useState<CoachRole>('head_coach');
  const [submitting, setSubmitting] = useState(false);

  const assignmentsByTeam = useMemo(() => {
    const map = new Map<string, CoachAssignment[]>();
    assignments.forEach((a) => {
      const tid = typeof a.teamId === 'string' ? a.teamId : a.teamId._id;
      const arr = map.get(tid) ?? [];
      arr.push(a);
      map.set(tid, arr);
    });
    return map;
  }, [assignments]);

  function openDialog() {
    if (teams.length === 0) {
      toast.error('Create a team first');
      return;
    }
    setUserId('');
    setTeamId('');
    setRole('head_coach');
    setOpen(true);
  }

  async function handleAssign() {
    if (!userId || !teamId) {
      toast.error('Pick a user and a team');
      return;
    }
    setSubmitting(true);
    try {
      await createCoachAssignment({ userId, teamId, role });
      setOpen(false);
      await refetch();
    } catch { /* toasted */ } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(a: CoachAssignment) {
    if (!confirm(`Remove ${userLabel(a.userId)} from ${teamLabel(a.teamId)}?`)) return;
    try { await deleteCoachAssignment(a.id); await refetch(); } catch { /* toasted */ }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Coach Assignments" description="Manage who coaches which team">
        <Button onClick={openDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Assign coach
        </Button>
      </PageHeader>

      {loading && assignments.length === 0 ? (
        <LoadingSpinner />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No coach assignments yet"
          description="Assign coaches to teams so they can see only the teams they manage."
        />
      ) : (
        <div className="grid gap-3">
          {teams.map((t) => {
            const list = assignmentsByTeam.get(t.id) ?? [];
            if (list.length === 0) return null;
            return (
              <Card key={t.id}>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold">{t.name} · {t.sport}</h3>
                  <ul className="divide-y">
                    {list.map((a) => (
                      <li key={a.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{userLabel(a.userId)}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {COACH_ROLE_LABELS[a.role]}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleRemove(a)}>
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign coach to team</DialogTitle>
            <DialogDescription>Grant a staff member coaching access to a team.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={(v: unknown) => setTeamId(v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a team" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Staff member</Label>
              <Select value={userId} onValueChange={(v: unknown) => setUserId(v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a person" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: unknown) => setRole(v as CoachRole)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COACH_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{COACH_ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={submitting}>
              {submitting ? 'Saving...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
