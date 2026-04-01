'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { CurriculumCoverage, CoverageStatus } from '@/types';

interface CoveragePopoverProps {
  topicId: string;
  currentCoverage?: CurriculumCoverage;
  classId: string;
  onSave: (
    topicId: string,
    data: {
      classId: string;
      status: string;
      dateCovered: string | null;
      notes: string;
      linkedLessonPlanId: string | null;
    },
  ) => Promise<void>;
}

const STATUS_LABELS: Record<CoverageStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

const STATUS_VARIANTS: Record<CoverageStatus, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  not_started: 'secondary',
  in_progress: 'default',
  completed: 'default',
  skipped: 'outline',
};

function getStatusClass(status: CoverageStatus): string {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'skipped') return 'bg-amber-100 text-amber-800 border-amber-200';
  return '';
}

export function CoveragePopover({
  topicId,
  currentCoverage,
  classId,
  onSave,
}: CoveragePopoverProps) {
  const currentStatus: CoverageStatus = currentCoverage?.status ?? 'not_started';
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(currentStatus);
  const [dateCovered, setDateCovered] = useState<string>(
    currentCoverage?.coveredAt ? currentCoverage.coveredAt.slice(0, 10) : '',
  );
  const [notes, setNotes] = useState<string>(currentCoverage?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(topicId, {
        classId,
        status,
        dateCovered: dateCovered || null,
        notes,
        linkedLessonPlanId: null,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="focus:outline-none" render={
        <button type="button" className="focus:outline-none" />
      }>
        <Badge
          variant={STATUS_VARIANTS[currentStatus]}
          className={getStatusClass(currentStatus)}
        >
          {STATUS_LABELS[currentStatus]}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3" align="start">
        <p className="text-sm font-semibold">Update Coverage</p>

        <div className="space-y-1">
          <Label htmlFor={`status-${topicId}`} className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v: unknown) => setStatus(v as string)}>
            <SelectTrigger id={`status-${topicId}`} className="w-full h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`date-${topicId}`} className="text-xs">Date Covered</Label>
          <Input
            id={`date-${topicId}`}
            type="date"
            value={dateCovered}
            onChange={(e) => setDateCovered(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`notes-${topicId}`} className="text-xs">
            Notes
          </Label>
          <Textarea
            id={`notes-${topicId}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Optional notes…"
            className="text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
