'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useStudentsList, useStaffList } from '@/hooks/useSport';
import { createTeam, updateTeam } from '@/hooks/useSportMutations';
import type { SportTeam } from '@/types/sport';

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  team: SportTeam | null;
  onSuccess: () => void;
}

export function TeamFormDialog({ open, onOpenChange, schoolId, team, onSuccess }: TeamFormDialogProps) {
  const { students } = useStudentsList();
  const { staff } = useStaffList();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [coachId, setCoachId] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setSport(team.sport);
      setAgeGroup(team.ageGroup ?? '');
      const coach = team.coachId;
      setCoachId(typeof coach === 'string' ? coach : coach?._id ?? '');
      setSelectedPlayers(
        team.playerIds.map((p) => (typeof p === 'string' ? p : p._id))
      );
      setIsActive(team.isActive);
    } else {
      setName(''); setSport(''); setAgeGroup('');
      setCoachId(''); setSelectedPlayers([]); setIsActive(true);
    }
  }, [team, open]);

  function togglePlayer(playerId: string) {
    setSelectedPlayers((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sport.trim()) {
      toast.error('Name and Sport are required');
      return;
    }
    setSubmitting(true);
    try {
      const base = {
        name: name.trim(),
        sport: sport.trim(),
        ageGroup: ageGroup.trim() || undefined,
        coachId: coachId || undefined,
        playerIds: selectedPlayers,
        isActive,
      };
      if (team) {
        await updateTeam(team.id, base);
        toast.success('Sport team updated successfully');
      } else {
        await createTeam({ ...base, schoolId });
        toast.success('Sport team created successfully');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to save team';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Team' : 'New Team'}</DialogTitle>
          <DialogDescription>
            {team ? 'Update team details and roster.' : 'Create a new sport team.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Name *</Label>
            <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. U15 Soccer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-sport">Sport *</Label>
            <Input id="team-sport" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="e.g. Soccer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-age">Age Group</Label>
            <Input id="team-age" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder="e.g. U15" />
          </div>
          <div className="space-y-2">
            <Label>Coach</Label>
            <Select value={coachId} onValueChange={(val: unknown) => setCoachId(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
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
            <Label>Players</Label>
            <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
              {students.length === 0 && (
                <p className="text-xs text-muted-foreground">No students found.</p>
              )}
              {students.map((s) => (
                <label key={s._id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedPlayers.includes(s._id)}
                    onCheckedChange={() => togglePlayer(s._id)}
                  />
                  {s.firstName} {s.lastName}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={(val: boolean) => setIsActive(val)} />
            <Label>Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
