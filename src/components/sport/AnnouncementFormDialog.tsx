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
import {
  createTeamAnnouncement, updateTeamAnnouncement,
} from '@/hooks/useTeamAnnouncements';
import {
  TEAM_ANNOUNCEMENT_PRIORITIES, TEAM_PRIORITY_LABELS,
  type TeamAnnouncement, type TeamAnnouncementPriority,
} from '@/types/team-announcement';
import type { SportTeam } from '@/types/sport';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: SportTeam[];
  announcement: TeamAnnouncement | null;
  onSuccess: () => void;
}

function teamIdOf(t: TeamAnnouncement['teamId']): string {
  return typeof t === 'string' ? t : t._id;
}

export function AnnouncementFormDialog({
  open, onOpenChange, teams, announcement, onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<TeamAnnouncementPriority>('normal');
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (announcement) {
      setTeamId(teamIdOf(announcement.teamId));
      setTitle(announcement.title);
      setBody(announcement.body);
      setPriority(announcement.priority);
      setPinned(announcement.pinned);
    } else {
      setTeamId('');
      setTitle('');
      setBody('');
      setPriority('normal');
      setPinned(false);
    }
  }, [announcement, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!announcement && !teamId) {
      toast.error('Please select a team');
      return;
    }
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    setSubmitting(true);
    try {
      if (announcement) {
        await updateTeamAnnouncement(announcement.id, {
          title: title.trim(),
          body: body.trim(),
          priority,
          pinned,
        });
      } else {
        await createTeamAnnouncement({
          teamId,
          title: title.trim(),
          body: body.trim(),
          priority,
          pinned,
        });
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
          <DialogTitle>{announcement ? 'Edit announcement' : 'New announcement'}</DialogTitle>
          <DialogDescription>
            Broadcast to players, parents, and staff of a specific team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            {!announcement && (
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
                placeholder="e.g. Match day — U15 vs Kingsford"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message <span className="text-destructive">*</span></Label>
              <Textarea
                id="body"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Kick-off 14:30. Be at the grounds by 13:45 in full kit..."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: unknown) => setPriority(v as TeamAnnouncementPriority)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAM_ANNOUNCEMENT_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{TEAM_PRIORITY_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="pinned" className="cursor-pointer">Pin to top</Label>
                <Switch id="pinned" checked={pinned} onCheckedChange={setPinned} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : announcement ? 'Save changes' : 'Publish'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
