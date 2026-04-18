'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  useTrainingAttendance, recordAttendance,
} from '@/hooks/useTraining';
import {
  TRAINING_ATTENDANCE_LABELS,
  type AttendanceEntry,
  type TrainingAttendanceStatus,
} from '@/types/training';
import type { SportPlayer } from '@/types/sport';
import { Users } from 'lucide-react';

interface Props {
  sessionId: string;
  players: SportPlayer[];
  onSaved?: () => void;
}

const STATUS_OPTIONS: TrainingAttendanceStatus[] = [
  'present', 'absent', 'late', 'excused', 'injured',
];

export function TrainingAttendancePanel({ sessionId, players, onSaved }: Props) {
  const { records, loading, refetch } = useTrainingAttendance(sessionId);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, AttendanceEntry>>({});

  const existingById = useMemo(() => {
    const map = new Map<string, AttendanceEntry>();
    records.forEach((r) => {
      const sid = typeof r.studentId === 'string' ? r.studentId : r.studentId._id;
      map.set(sid, {
        studentId: sid,
        status: r.status,
        notes: r.notes ?? undefined,
        rating: r.rating ?? undefined,
      });
    });
    return map;
  }, [records]);

  useEffect(() => {
    const initial: Record<string, AttendanceEntry> = {};
    players.forEach((p) => {
      const existing = existingById.get(p._id);
      initial[p._id] = existing ?? {
        studentId: p._id,
        status: 'present',
      };
    });
    setDraft(initial);
  }, [players, existingById]);

  function updateStatus(studentId: string, status: TrainingAttendanceStatus) {
    setDraft((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  }

  function updateRating(studentId: string, rating: string) {
    const n = Number.parseInt(rating, 10);
    setDraft((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        rating: Number.isFinite(n) && n >= 1 && n <= 5 ? n : undefined,
      },
    }));
  }

  function updateNotes(studentId: string, notes: string) {
    setDraft((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes: notes || undefined },
    }));
  }

  async function handleSave() {
    const entries = Object.values(draft);
    if (entries.length === 0) return;
    setSaving(true);
    try {
      await recordAttendance(sessionId, entries);
      await refetch();
      onSaved?.();
    } catch {
      // toast handled in hook
    } finally {
      setSaving(false);
    }
  }

  if (loading && records.length === 0 && players.length === 0) {
    return <LoadingSpinner />;
  }

  if (players.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No players on this team"
        description="Add players to the team to record attendance."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-2 pr-2">Player</th>
              <th className="pb-2 pr-2">Status</th>
              <th className="pb-2 pr-2">Rating</th>
              <th className="pb-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const entry = draft[p._id];
              if (!entry) return null;
              return (
                <tr key={p._id} className="border-b last:border-0">
                  <td className="py-2 pr-2 font-medium">
                    {p.firstName} {p.lastName}
                  </td>
                  <td className="py-2 pr-2">
                    <Select
                      value={entry.status}
                      onValueChange={(v: unknown) =>
                        updateStatus(p._id, v as TrainingAttendanceStatus)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {TRAINING_ATTENDANCE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={entry.rating ?? ''}
                      onChange={(e) => updateRating(p._id, e.target.value)}
                      placeholder="1-5"
                      className="w-full sm:w-20"
                    />
                  </td>
                  <td className="py-2">
                    <Input
                      value={entry.notes ?? ''}
                      onChange={(e) => updateNotes(p._id, e.target.value)}
                      placeholder="Optional"
                      className="w-full"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Save attendance</>
          )}
        </Button>
      </div>
    </div>
  );
}
