'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PacingTopic, TopicStatus, PacingUpdatePayload, TopicUpdateEntry } from '@/types/curriculum';

interface PacingUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: PacingTopic[];
  onSubmit: (data: PacingUpdatePayload) => Promise<void>;
}

interface TopicFormState {
  topicId: string;
  status: TopicStatus;
  completedDate: string;
  notes: string;
}

const TOPIC_STATUSES: { value: TopicStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
];

function buildInitialTopicStates(topics: PacingTopic[]): TopicFormState[] {
  return topics.map((t) => ({
    topicId: t.id,
    status: t.status,
    completedDate: t.completedDate ?? '',
    notes: '',
  }));
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface TopicRowProps {
  topic: PacingTopic;
  state: TopicFormState;
  onChange: (updated: Partial<TopicFormState>) => void;
}

function TopicUpdateRow({ topic, state, onChange }: TopicRowProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <p className="text-sm font-medium truncate">
        Wk {topic.weekNumber} — {topic.title}
      </p>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={state.status}
            onValueChange={(val: unknown) => onChange({ status: val as TopicStatus })}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOPIC_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {state.status === 'completed' && (
          <div className="space-y-1">
            <Label className="text-xs">Completion Date</Label>
            <Input
              type="date"
              className="w-full h-8 text-xs"
              value={state.completedDate}
              onChange={(e) => onChange({ completedDate: e.target.value })}
            />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes (optional)</Label>
        <Input
          className="w-full text-xs"
          placeholder="Add topic notes..."
          value={state.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}

export function PacingUpdateDialog({
  open,
  onOpenChange,
  topics,
  onSubmit,
}: PacingUpdateDialogProps) {
  const [topicStates, setTopicStates] = useState<TopicFormState[]>([]);
  const [weekEnding, setWeekEnding] = useState('');
  const [overallNotes, setOverallNotes] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');
  const [plannedContentDelivered, setPlannedContentDelivered] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTopicStates(buildInitialTopicStates(topics));
      setWeekEnding(toISODate(new Date()));
      setOverallNotes('');
      setChallengesFaced('');
      setPlannedContentDelivered('');
      setSubmitting(false);
    }
  }, [open, topics]);

  function updateTopicState(topicId: string, patch: Partial<TopicFormState>): void {
    setTopicStates((prev) =>
      prev.map((s) => (s.topicId === topicId ? { ...s, ...patch } : s)),
    );
  }

  async function handleSubmit(): Promise<void> {
    const topicUpdates: TopicUpdateEntry[] = topicStates.map((s) => ({
      topicId: s.topicId,
      status: s.status,
      ...(s.status === 'completed' && s.completedDate ? { completedDate: s.completedDate } : {}),
      ...(s.notes.trim() ? { notes: s.notes.trim() } : {}),
    }));

    const payload: PacingUpdatePayload = {
      weekEnding,
      topicUpdates,
      ...(overallNotes.trim() ? { overallNotes: overallNotes.trim() } : {}),
      ...(challengesFaced.trim() ? { challengesFaced: challengesFaced.trim() } : {}),
      ...(plannedContentDelivered
        ? { plannedContentDelivered: Number(plannedContentDelivered) }
        : {}),
    };

    try {
      setSubmitting(true);
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to submit pacing update', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Weekly Pacing Update</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="weekEnding">
                Week Ending <span className="text-destructive">*</span>
              </Label>
              <Input
                id="weekEnding"
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plannedContent">Planned Content Delivered (%)</Label>
              <Input
                id="plannedContent"
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 80"
                value={plannedContentDelivered}
                onChange={(e) => setPlannedContentDelivered(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {topicStates.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Topic Updates</p>
              {topics.map((topic, idx) => {
                const state = topicStates[idx];
                if (!state) return null;
                return (
                  <TopicUpdateRow
                    key={topic.id}
                    topic={topic}
                    state={state}
                    onChange={(patch) => updateTopicState(topic.id, patch)}
                  />
                );
              })}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="overallNotes">Overall Notes</Label>
            <Textarea
              id="overallNotes"
              placeholder="Summary of the week's progress..."
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              className="min-h-18 w-full resize-none"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="challengesFaced">Challenges Faced</Label>
            <Textarea
              id="challengesFaced"
              placeholder="Any blockers or challenges this week..."
              value={challengesFaced}
              onChange={(e) => setChallengesFaced(e.target.value)}
              className="min-h-18 w-full resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !weekEnding}>
            {submitting ? 'Saving...' : 'Save Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
