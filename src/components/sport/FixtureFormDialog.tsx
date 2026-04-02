'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { createFixture, updateFixture } from '@/hooks/useSportMutations';
import type { SportFixture, SportTeam } from '@/types/sport';

interface FixtureFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  teams: SportTeam[];
  fixture: SportFixture | null;
  onSuccess: () => void;
}

export function FixtureFormDialog({
  open, onOpenChange, schoolId, teams, fixture, onSuccess,
}: FixtureFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (fixture) {
      const tRef = fixture.teamId;
      setTeamId(typeof tRef === 'string' ? tRef : tRef._id);
      setOpponent(fixture.opponent);
      setDate(fixture.date ? fixture.date.slice(0, 10) : '');
      setTime(fixture.time);
      setVenue(fixture.venue);
      setIsHome(fixture.isHome);
      setNotes(fixture.notes ?? '');
    } else {
      setTeamId(''); setOpponent(''); setDate('');
      setTime(''); setVenue(''); setIsHome(true); setNotes('');
    }
  }, [fixture, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opponent.trim() || !date || !time.trim() || !venue.trim()) {
      toast.error('Opponent, date, time, and venue are required');
      return;
    }
    if (!fixture && !teamId) {
      toast.error('Please select a team');
      return;
    }
    setSubmitting(true);
    try {
      const isoDate = new Date(date).toISOString();
      if (fixture) {
        await updateFixture(fixture.id, {
          opponent: opponent.trim(),
          date: isoDate,
          time: time.trim(),
          venue: venue.trim(),
          isHome,
          notes: notes.trim() || undefined,
        });
        toast.success('Fixture updated successfully');
      } else {
        await createFixture({
          teamId,
          schoolId,
          opponent: opponent.trim(),
          date: isoDate,
          time: time.trim(),
          venue: venue.trim(),
          isHome,
          notes: notes.trim() || undefined,
        });
        toast.success('Sport fixture created successfully');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to save fixture';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fixture ? 'Edit Fixture' : 'New Fixture'}</DialogTitle>
          <DialogDescription>
            {fixture ? 'Update fixture details.' : 'Schedule a new match.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixture && (
            <div className="space-y-2">
              <Label>Team *</Label>
              <Select value={teamId} onValueChange={(val: unknown) => setTeamId(val as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.sport})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fx-opponent">Opponent *</Label>
            <Input id="fx-opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. Greenfields High" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fx-date">Date *</Label>
              <Input id="fx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fx-time">Time *</Label>
              <Input id="fx-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fx-venue">Venue *</Label>
            <Input id="fx-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Home Ground" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isHome} onCheckedChange={(val: boolean) => setIsHome(val)} />
            <Label>Home Game</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fx-notes">Notes</Label>
            <Textarea id="fx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : fixture ? 'Update' : 'Schedule Fixture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
