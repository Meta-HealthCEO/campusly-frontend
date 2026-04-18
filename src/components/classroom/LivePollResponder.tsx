'use client';

import { useMemo } from 'react';
import { CheckCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PollData, PollResponse } from '@/hooks/useClassroomSocket';

interface LivePollResponderProps {
  poll: PollData;
  responses: PollResponse[];
  currentUserId: string;
  onRespond: (optionIndex: number) => void;
  isTeacher: boolean;
  onEndPoll?: () => void;
}

export function LivePollResponder({
  poll,
  responses,
  currentUserId,
  onRespond,
  isTeacher,
  onEndPoll,
}: LivePollResponderProps) {
  const hasVoted = useMemo(
    () => responses.some((r) => r.userId === currentUserId),
    [responses, currentUserId],
  );

  const totalVotes = responses.length;

  const optionCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of responses) {
      counts.set(r.optionIndex, (counts.get(r.optionIndex) ?? 0) + 1);
    }
    return counts;
  }, [responses]);

  const showResults = hasVoted || isTeacher;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">{poll.question}</p>

      <div className="space-y-2">
        {poll.options.map((option, idx) => {
          const count = optionCounts.get(idx) ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

          return (
            <button
              key={idx}
              type="button"
              disabled={hasVoted}
              onClick={() => onRespond(idx)}
              className={cn(
                'relative w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors',
                hasVoted ? 'cursor-default' : 'hover:bg-muted/50 cursor-pointer',
              )}
            >
              {showResults && (
                <div
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span className="truncate">{option}</span>
                {showResults && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{pct}%</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {hasVoted && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircleIcon className="size-3.5 text-emerald-600" />
          Response recorded ({totalVotes} vote{totalVotes !== 1 ? 's' : ''})
        </div>
      )}

      {isTeacher && onEndPoll && (
        <Button variant="outline" size="sm" onClick={onEndPoll} className="w-full sm:w-auto">
          End Poll
        </Button>
      )}
    </div>
  );
}
