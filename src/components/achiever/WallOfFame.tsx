'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy, Medal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WallOfFameData, WallOfFameEntry, PopulatedStudent } from '@/hooks/useAchiever';

interface WallOfFameProps {
  data: WallOfFameData | null;
  loading: boolean;
}

function getStudentDisplayName(s: PopulatedStudent): string {
  if (s.user) return `${s.user.firstName} ${s.user.lastName}`;
  if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
  return s.admissionNumber ?? 'Unknown';
}

function rankStyle(index: number): string {
  if (index === 0) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400';
  if (index === 1) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  if (index === 2) return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400';
  return 'bg-muted text-muted-foreground';
}

function EntryList({ entries }: { entries: WallOfFameEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState icon={Trophy} title="No achievers yet" description="Award achievements to see them here." />;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={entry._id} className="flex items-center gap-3 rounded-lg border p-3">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', rankStyle(i))}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getStudentDisplayName(entry.student)}</p>
            <p className="text-xs text-muted-foreground">{entry.achievementCount} achievement{entry.achievementCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">{entry.totalPoints}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const tabs: { value: keyof WallOfFameData; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'sport', label: 'Sport' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'behaviour', label: 'Behaviour' },
];

export function WallOfFame({ data, loading }: WallOfFameProps) {
  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="h-5 w-5 text-amber-500" />
          Wall of Fame
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <EmptyState icon={Trophy} title="No data" description="Wall of fame data will appear here." />
        ) : (
          <Tabs defaultValue="academic">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <EntryList entries={data[tab.value] ?? []} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
