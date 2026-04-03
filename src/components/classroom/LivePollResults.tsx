'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LivePoll } from '@/types';

interface LivePollResultsProps {
  poll: LivePoll;
}

interface OptionResult {
  label: string;
  count: number;
  percent: number;
}

export function LivePollResults({ poll }: LivePollResultsProps) {
  const results: OptionResult[] = useMemo(() => {
    const total = poll.responses.length;
    return poll.options.map((label, idx) => {
      const count = poll.responses.filter((r) => r.answer === idx).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return { label, count, percent };
    });
  }, [poll]);

  const totalResponses = poll.responses.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{poll.question}</CardTitle>
        <p className="text-xs text-muted-foreground">{totalResponses} {totalResponses === 1 ? 'response' : 'responses'}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No options available</p>
        )}
        {results.map((result, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate max-w-[70%]">{result.label}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {result.count} ({result.percent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${result.percent}%` }}
                role="progressbar"
                aria-valuenow={result.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
