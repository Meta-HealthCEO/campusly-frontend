'use client';

import { MonitorUpIcon, MicOffIcon, BarChart2Icon, CircleIcon, PhoneOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VirtualSession } from '@/types';

interface TeacherControlsProps {
  session: VirtualSession;
  onEnd: () => void;
  onToggleMute?: () => void;
  onShareScreen?: () => void;
  onCreatePoll?: () => void;
}

export function TeacherControls({
  session,
  onEnd,
  onToggleMute,
  onShareScreen,
  onCreatePoll,
}: TeacherControlsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Host Controls</p>
        {session.isRecorded && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <CircleIcon className="size-3 animate-pulse" />
            Recording
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {onShareScreen && (
          <Button
            variant="outline"
            size="default"
            onClick={onShareScreen}
            className="flex w-full flex-col gap-1 h-auto py-3"
          >
            <MonitorUpIcon className="size-5" />
            <span className="text-xs">Share Screen</span>
          </Button>
        )}

        {onCreatePoll && (
          <Button
            variant="outline"
            size="default"
            onClick={onCreatePoll}
            className="flex w-full flex-col gap-1 h-auto py-3"
          >
            <BarChart2Icon className="size-5" />
            <span className="text-xs">Create Poll</span>
          </Button>
        )}

        {onToggleMute && (
          <Button
            variant="outline"
            size="default"
            onClick={onToggleMute}
            className="flex w-full flex-col gap-1 h-auto py-3"
          >
            <MicOffIcon className="size-5" />
            <span className="text-xs">Mute All</span>
          </Button>
        )}

        <Button
          variant="destructive"
          size="default"
          onClick={onEnd}
          className="flex w-full flex-col gap-1 h-auto py-3 col-span-2 sm:col-span-1"
        >
          <PhoneOffIcon className="size-5" />
          <span className="text-xs">End Session</span>
        </Button>
      </div>
    </div>
  );
}
