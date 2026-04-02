'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { setPlayerAvailability } from '@/hooks/useSportMutations';
import type { PlayerAvailability, SportPlayer } from '@/types/sport';

interface AvailabilityPanelProps {
  fixtureId: string;
  schoolId: string;
  players: SportPlayer[];
  availability: PlayerAvailability[];
  loading: boolean;
  onRefresh: () => void;
}

type AvailStatus = 'available' | 'unavailable' | 'injured';

const statusColors: Record<AvailStatus, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  unavailable: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  injured: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function getStudentId(a: PlayerAvailability): string {
  const s = a.studentId;
  return typeof s === 'string' ? s : s._id;
}

function getStudentName(a: PlayerAvailability): string {
  const s = a.studentId;
  if (typeof s === 'string') return s;
  return `${s.firstName} ${s.lastName}`;
}

export function AvailabilityPanel({
  fixtureId, schoolId, players, availability, loading, onRefresh,
}: AvailabilityPanelProps) {
  const [saving, setSaving] = useState<string | null>(null);

  const existingMap = new Map(
    availability.map((a) => [getStudentId(a), a])
  );

  async function setStatus(studentId: string, status: AvailStatus, parentConfirmed?: boolean, notes?: string) {
    setSaving(studentId);
    try {
      await setPlayerAvailability(fixtureId, {
        studentId,
        schoolId,
        status,
        parentConfirmed: parentConfirmed ?? false,
        notes: notes || undefined,
      });
      toast.success('Availability updated');
      onRefresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to update availability';
      toast.error(msg);
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <LoadingSpinner size="sm" />;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Player Availability</h4>
      {players.length === 0 ? (
        <p className="text-xs text-muted-foreground">No players on this team.</p>
      ) : (
        <div className="space-y-2">
          {players.map((player) => {
            const record = existingMap.get(player._id);
            const currentStatus: AvailStatus = (record?.status as AvailStatus) ?? 'available';
            const parentConf = record?.parentConfirmed ?? false;
            return (
              <PlayerRow
                key={player._id}
                player={player}
                status={currentStatus}
                parentConfirmed={parentConf}
                notes={record?.notes ?? ''}
                isSaving={saving === player._id}
                onSetStatus={(s, pc, n) => setStatus(player._id, s, pc, n)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PlayerRowProps {
  player: SportPlayer;
  status: AvailStatus;
  parentConfirmed: boolean;
  notes: string;
  isSaving: boolean;
  onSetStatus: (status: AvailStatus, parentConfirmed: boolean, notes: string) => void;
}

function PlayerRow({ player, status, parentConfirmed, notes, isSaving, onSetStatus }: PlayerRowProps) {
  const [localStatus, setLocalStatus] = useState<AvailStatus>(status);
  const [localParent, setLocalParent] = useState(parentConfirmed);
  const [localNotes, setLocalNotes] = useState(notes);

  return (
    <div className="flex flex-col gap-2 rounded-md border p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{player.firstName} {player.lastName}</span>
        <Badge className={statusColors[localStatus]}>{localStatus}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={localStatus}
          onValueChange={(val: unknown) => setLocalStatus(val as AvailStatus)}>
          <SelectTrigger className="w-32" data-size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
            <SelectItem value="injured">Injured</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Switch checked={localParent} onCheckedChange={(v: boolean) => setLocalParent(v)} size="sm" />
          <span className="text-xs text-muted-foreground">Parent OK</span>
        </div>
        <Input className="h-7 text-xs flex-1 min-w-[100px]" placeholder="Notes"
          value={localNotes} onChange={(e) => setLocalNotes(e.target.value)} />
        <Button size="sm" variant="outline" disabled={isSaving}
          onClick={() => onSetStatus(localStatus, localParent, localNotes)}>
          {isSaving ? '...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
