'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  createTrainingSession, updateTrainingSession, useDrillTemplates,
} from '@/hooks/useTraining';
import {
  TRAINING_FOCUS_LABELS,
  type TrainingSession,
  type TrainingFocus,
  type TrainingSessionStatus,
} from '@/types/training';
import type { SportTeam } from '@/types/sport';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: SportTeam[];
  session: TrainingSession | null;
  onSuccess: () => void;
}

const FOCUS_OPTIONS = Object.keys(TRAINING_FOCUS_LABELS) as TrainingFocus[];
const STATUS_OPTIONS: TrainingSessionStatus[] = ['scheduled', 'completed', 'cancelled'];

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TrainingSessionFormDialog({
  open, onOpenChange, teams, session, onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const { drills } = useDrillTemplates();

  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [location, setLocation] = useState('');
  const [focus, setFocus] = useState<TrainingFocus[]>([]);
  const [drillIds, setDrillIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TrainingSessionStatus>('scheduled');

  useEffect(() => {
    if (!open) return;
    if (session) {
      setTeamId(
        typeof session.teamId === 'string' ? session.teamId : session.teamId._id,
      );
      setTitle(session.title);
      setDate(toDateInputValue(session.date));
      setStartTime(session.startTime);
      setDurationMinutes(String(session.durationMinutes));
      setLocation(session.location ?? '');
      setFocus(session.focus ?? []);
      setDrillIds(
        (session.drillIds ?? []).map((d) => (typeof d === 'string' ? d : d._id ?? d.id ?? '')),
      );
      setNotes(session.notes ?? '');
      setStatus(session.status);
    } else {
      setTeamId('');
      setTitle('');
      setDate('');
      setStartTime('');
      setDurationMinutes('60');
      setLocation('');
      setFocus([]);
      setDrillIds([]);
      setNotes('');
      setStatus('scheduled');
    }
  }, [session, open]);

  function toggleDrill(id: string) {
    setDrillIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleFocus(value: TrainingFocus) {
    setFocus((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      toast.error('Please select a team');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const dur = Number.parseInt(durationMinutes, 10);
    if (!date || !startTime || !Number.isFinite(dur) || dur <= 0) {
      toast.error('Date, start time, and a positive duration are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        date: new Date(date).toISOString(),
        startTime: startTime.trim(),
        durationMinutes: dur,
        location: location.trim() || undefined,
        focus,
        drillIds,
        notes: notes.trim() || undefined,
        status,
      };
      if (session) {
        await updateTrainingSession(session.id, payload);
      } else {
        await createTrainingSession({ ...payload, teamId });
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      // toast handled in hook
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{session ? 'Edit training session' : 'New training session'}</DialogTitle>
          <DialogDescription>
            Schedule a training session for one of your teams.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            {!session && (
              <div className="space-y-2">
                <Label htmlFor="team">Team <span className="text-destructive">*</span></Label>
                <Select value={teamId} onValueChange={(v: unknown) => setTeamId(v as string)}>
                  <SelectTrigger id="team" className="w-full">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} · {t.sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Match prep — defensive shape"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start time <span className="text-destructive">*</span></Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min) <span className="text-destructive">*</span></Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Main field"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Focus areas</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FOCUS_OPTIONS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={focus.includes(f)}
                      onCheckedChange={() => toggleFocus(f)}
                    />
                    <span>{TRAINING_FOCUS_LABELS[f]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v: unknown) => setStatus(v as TrainingSessionStatus)}>
                <SelectTrigger id="status" className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {drills.length > 0 && (
              <div className="space-y-2">
                <Label>Attach drills</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {drills.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-accent">
                      <Checkbox
                        checked={drillIds.includes(d.id)}
                        onCheckedChange={() => toggleDrill(d.id)}
                      />
                      <span className="truncate">
                        {d.name}
                        {d.durationMinutes ? ` · ${d.durationMinutes}m` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Session plan / notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Drills, warm-up, focus points..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-4 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : session ? 'Save changes' : 'Create session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
