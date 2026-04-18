'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranscriptSegment } from '@/hooks/useLessonNotes';

interface TranscriptViewProps {
  transcript: TranscriptSegment[];
  onTimestampClick?: (seconds: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TranscriptView({ transcript, onTimestampClick }: TranscriptViewProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transcript;
    return transcript.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        s.speaker.toLowerCase().includes(q),
    );
  }, [transcript, search]);

  if (transcript.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No transcript available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcript..."
          className="pl-9"
        />
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No matches.</p>
        ) : (
          filtered.map((segment, i) => (
            <div key={i} className="flex gap-3 rounded-lg border p-3">
              <Button
                size="sm"
                variant="ghost"
                className="font-mono text-xs shrink-0 h-auto py-0.5"
                onClick={() => onTimestampClick?.(segment.timestamp)}
                disabled={!onTimestampClick}
              >
                {formatTime(segment.timestamp)}
              </Button>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-xs font-semibold mb-1',
                    segment.speaker === 'Teacher'
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {segment.speaker}
                </p>
                <p className="text-sm">{segment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
