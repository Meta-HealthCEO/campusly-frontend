'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';

interface AttendanceBulkMarkMenuProps {
  onMarkAll: (status: AttendanceStatus) => void;
  disabled?: boolean;
}

export function AttendanceBulkMarkMenu({ onMarkAll, disabled }: AttendanceBulkMarkMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <Button
        variant="outline"
        onClick={() => onMarkAll('present')}
        disabled={disabled}
        className="rounded-r-none"
      >
        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
        Mark all present
      </Button>
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded-l-none border-l-0 px-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More bulk mark options"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-md border bg-popover shadow-md"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => { onMarkAll('absent'); setOpen(false); }}
          >
            Mark all absent
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => { onMarkAll('late'); setOpen(false); }}
          >
            Mark all late
          </button>
        </div>
      ) : null}
    </div>
  );
}
