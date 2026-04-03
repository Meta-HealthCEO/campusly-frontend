'use client';

import { Circle, CheckCircle2, Clock, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CurriculumTopic, TopicStatus } from '@/types/curriculum';

interface TopicProgressListProps {
  topics: CurriculumTopic[];
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

const statusIcon: Record<TopicStatus, React.ReactNode> = {
  not_started: <Circle className="h-4 w-4 text-muted-foreground shrink-0" />,
  in_progress: <Clock className="h-4 w-4 text-amber-500 shrink-0" />,
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  skipped: <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />,
};

const statusLabel: Record<TopicStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

interface TopicRowProps {
  topic: CurriculumTopic;
}

function TopicRow({ topic }: TopicRowProps) {
  const isSkipped = topic.status === 'skipped';

  return (
    <li className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-3 border-b last:border-b-0">
      <div className="flex items-start gap-2 sm:items-center min-w-0 flex-1">
        <span className="text-xs text-muted-foreground w-8 shrink-0 pt-0.5 sm:pt-0">
          Wk {topic.weekNumber}
        </span>
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {statusIcon[topic.status]}
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'text-sm font-medium leading-snug',
                isSkipped && 'line-through text-muted-foreground',
              )}
            >
              {topic.title}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDateRange(topic.expectedStartDate, topic.expectedEndDate)}
              {' · '}
              <span>{statusLabel[topic.status]}</span>
            </p>
          </div>
        </div>
      </div>

      {topic.status === 'in_progress' && (
        <div className="flex items-center gap-2 pl-10 sm:pl-0 sm:w-40 shrink-0">
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${topic.percentComplete}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
            {topic.percentComplete}%
          </span>
        </div>
      )}
    </li>
  );
}

export function TopicProgressList({ topics }: TopicProgressListProps) {
  if (topics.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No topics found for this plan.
      </p>
    );
  }

  return (
    <div className="overflow-y-auto max-h-[480px] rounded-lg border bg-card">
      <ul className="divide-y divide-border px-4">
        {topics.map((topic) => (
          <TopicRow key={topic.id} topic={topic} />
        ))}
      </ul>
    </div>
  );
}
