'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LessonStatusPill } from '@/components/lessons/LessonStatusPill';
import type { LessonStatus } from '@/types/lesson';

const NEXT_STATUSES: Record<LessonStatus, LessonStatus[]> = {
  draft: ['ready', 'taught'],
  ready: ['draft', 'taught'],
  taught: ['ready'],
};

const STATUS_LABEL: Record<LessonStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  taught: 'Taught',
};

interface Props {
  status: LessonStatus;
  onChange: (next: LessonStatus) => Promise<unknown>;
}

export function LessonStatusMenu({ status, onChange }: Props) {
  const [saving, setSaving] = useState<LessonStatus | null>(null);

  const handle = async (next: LessonStatus) => {
    setSaving(next);
    try {
      await onChange(next);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Change status"
          />
        }
      >
        <LessonStatusPill status={status} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-2">
        <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
          Move to
        </p>
        <div className="flex flex-col gap-1">
          {NEXT_STATUSES[status].map((next) => (
            <Button
              key={next}
              variant="ghost"
              size="sm"
              className="justify-start"
              disabled={saving !== null}
              onClick={() => void handle(next)}
            >
              {saving === next && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              {STATUS_LABEL[next]}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
