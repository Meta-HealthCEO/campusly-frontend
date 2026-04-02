'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUp } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy } from 'lucide-react';
import type { PersonalBest } from '@/types/sport';

interface PersonalBestTableProps {
  bests: PersonalBest[];
}

function isRecent(dateStr: string): boolean {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

export function PersonalBestTable({ bests }: PersonalBestTableProps) {
  const sorted = useMemo(
    () => [...bests].sort((a, b) => a.event.localeCompare(b.event)),
    [bests]
  );

  if (sorted.length === 0) {
    return <EmptyState icon={Trophy} title="No personal bests" description="No records have been set yet." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-3 font-medium">Event</th>
            <th className="pb-2 pr-3 font-medium">Best</th>
            <th className="pb-2 pr-3 font-medium">Date</th>
            <th className="pb-2 font-medium">Improvement</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pb) => {
            const improvement = pb.previousBest != null
              ? Math.abs(pb.value - pb.previousBest)
              : null;
            return (
              <tr key={pb.id} className="border-b">
                <td className="py-2 pr-3 font-medium">
                  {pb.event}
                  {isRecent(pb.date) && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">NEW PB</Badge>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {pb.value} {pb.unit}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {formatDate(pb.date)}
                </td>
                <td className="py-2">
                  {improvement != null ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <ArrowUp className="h-3 w-3" />
                      {improvement.toFixed(2)} {pb.unit}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
