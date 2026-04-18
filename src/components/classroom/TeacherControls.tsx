'use client';

import { useLocalParticipant } from '@livekit/components-react';
import {
  MicIcon, MicOffIcon, VideoIcon, VideoOffIcon,
  MonitorUpIcon, BarChart2Icon, PhoneOffIcon, Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TeacherControlsProps {
  onEnd: () => void;
  onCreatePoll?: () => void;
  isRecording?: boolean;
  recordingDuration?: string;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export function TeacherControls({
  onEnd,
  onCreatePoll,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
}: TeacherControlsProps) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <Button
        variant={isMicrophoneEnabled ? 'outline' : 'destructive'}
        size="default"
        onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      >
        {isMicrophoneEnabled ? <MicIcon className="size-4 mr-1.5" /> : <MicOffIcon className="size-4 mr-1.5" />}
        {isMicrophoneEnabled ? 'Mute' : 'Unmute'}
      </Button>

      <Button
        variant={isCameraEnabled ? 'outline' : 'secondary'}
        size="default"
        onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
      >
        {isCameraEnabled ? <VideoIcon className="size-4 mr-1.5" /> : <VideoOffIcon className="size-4 mr-1.5" />}
        {isCameraEnabled ? 'Stop Camera' : 'Start Camera'}
      </Button>

      <Button
        variant={isScreenShareEnabled ? 'default' : 'outline'}
        size="default"
        onClick={() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
      >
        <MonitorUpIcon className="size-4 mr-1.5" />
        {isScreenShareEnabled ? 'Stop Share' : 'Share Screen'}
      </Button>

      {onStartRecording && onStopRecording && (
        <Button
          variant={isRecording ? 'destructive' : 'secondary'}
          size="icon"
          onClick={isRecording ? onStopRecording : onStartRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          className="relative"
        >
          <Circle className={cn('h-5 w-5', isRecording && 'animate-pulse fill-current')} />
          {isRecording && recordingDuration && (
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-destructive font-mono whitespace-nowrap">
              REC {recordingDuration}
            </span>
          )}
        </Button>
      )}

      {onCreatePoll && (
        <Button variant="outline" size="default" onClick={onCreatePoll}>
          <BarChart2Icon className="size-4 mr-1.5" />
          Poll
        </Button>
      )}

      <Button variant="destructive" size="default" onClick={onEnd}>
        <PhoneOffIcon className="size-4 mr-1.5" />
        End Session
      </Button>
    </div>
  );
}
