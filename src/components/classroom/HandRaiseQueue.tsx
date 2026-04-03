'use client';

import { HandIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HandRaiseEntry {
  userId: string;
  name: string;
  raisedAt: string;
}

interface HandRaiseQueueProps {
  hands: HandRaiseEntry[];
  onLower?: (userId: string) => void;
}

function formatRelativeTime(raisedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(raisedAt).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function HandRaiseQueue({ hands, onLower }: HandRaiseQueueProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <HandIcon className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Raised Hands</p>
        <span className="ml-auto text-xs text-muted-foreground">{hands.length}</span>
      </div>

      {hands.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">No raised hands</p>
      ) : (
        <ol className="divide-y">
          {hands.map((entry, idx) => (
            <li key={entry.userId} className="flex items-center gap-3 px-4 py-2">
              <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
              <span className="flex-1 text-sm font-medium truncate">{entry.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(entry.raisedAt)}</span>
              {onLower && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onLower(entry.userId)}
                  aria-label={`Lower hand for ${entry.name}`}
                >
                  <XIcon className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
