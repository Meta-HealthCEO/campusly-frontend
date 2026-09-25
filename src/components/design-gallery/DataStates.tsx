'use client';

import { useEffect, useState } from 'react';
import { BookOpen, ClipboardCheck, Plus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import {
  DataTable, EmptyState, ErrorState, ListSkeleton, LoadingSpinner, PageHeader, StatCard, TableSkeleton, type ColumnDef,
} from '@/components/shared';
import { LessonDropOffChart } from '@/components/courses/LessonDropOffChart';
import { MASTERY_LABEL, masteryLevel } from '@/lib/readiness/mastery';
import { GallerySection, Specimen } from './GallerySection';

const BADGES = ['default', 'secondary', 'outline', 'ghost', 'link', 'success', 'attention', 'destructive', 'info', 'secure', 'building', 'weak'] as const;

/** Made-up lesson progress for the chart specimen: Recharts draws it in the theme's series colours. */
const DROP_OFF = ['Place value', 'Fractions', 'Decimals', 'Percentages', 'Ratio'].map((title: string, i: number) => ({
  lessonId: String(i), title, orderIndex: i, studentsReached: 28 - i * 3, studentsCompleted: 24 - i * 4,
}));

interface ExampleRow {
  name: string;
  className: string;
  mark: number;
}

const FIRST = ['Anele', 'Thabo', 'Aisha', 'Pieter', 'Lerato', 'Sipho'];
const LAST = ['Khumalo', 'Naidoo', 'van Wyk', 'Mokoena', 'Dlamini'];

/** 30 made-up learners, the same on server and client (no randomness). */
const ROWS: ExampleRow[] = Array.from({ length: 30 }, (_: unknown, i: number) => ({
  name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
  className: i % 2 === 0 ? 'Grade 12 A' : 'Grade 12 B',
  mark: 38 + ((i * 37) % 60),
}));

const COLUMNS: ColumnDef<ExampleRow>[] = [
  { accessorKey: 'name', header: 'Learner' },
  { accessorKey: 'className', header: 'Class' },
  {
    accessorKey: 'mark',
    header: 'Paper 1',
    cell: ({ row }) => <span className="font-heading font-semibold tabular-nums">{row.original.mark}%</span>,
  },
  {
    id: 'level',
    header: 'Mastery',
    cell: ({ row }) => {
      const level = masteryLevel(row.original.mark);
      return <Badge variant={level}>{MASTERY_LABEL[level]}</Badge>;
    },
  },
];

function RetryableError() {
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (!retrying) return;
    const timer = setTimeout(() => setRetrying(false), 1000);
    return () => clearTimeout(timer);
  }, [retrying]);
  return (
    <ErrorState
      title="Marks didn't load"
      message="The server took too long to answer. Your marks are safe; try again."
      onRetry={() => setRetrying(true)}
      retrying={retrying}
    />
  );
}

/** Spec §4: cards, chips, tables, figures, headers and the loading, empty and error states. */
export function DataStates() {
  return (
    <GallerySection
      id="data"
      index="04"
      title="Data display and states"
      description="Every data view has a loading, an empty and an error state. Tables scroll sideways inside their own box; the head stays in view from tablet width."
    >
      <Specimen title="Page header (eyebrow, title, one line, one action)">
        <PageHeader eyebrow="Grade 12 A · Mathematics" title="Homework" description="Set, collect and mark homework for this class.">
          <Button><Plus aria-hidden="true" /> Set homework</Button>
        </PageHeader>
      </Specimen>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Learners" value="28" icon={Users} description="Across two classes" trend={{ value: 4, label: 'this term' }} />
        <StatCard title="To mark" value="12" icon={ClipboardCheck} tone="attention" description="Oldest from Tuesday" />
        <StatCard title="Handed in" value="96%" icon={BookOpen} tone="success" trend={{ value: -2, label: 'vs last week' }} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>A 16px card on the white surface with a hairline border.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={62}>
              <ProgressLabel>Term plan covered</ProgressLabel>
              <ProgressValue />
            </Progress>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline" size="sm">Open plan</Button>
          </CardFooter>
        </Card>
        <Specimen title="Badges and mastery chips">
          <div className="flex flex-wrap gap-2">
            {BADGES.map((variant) => <Badge key={variant} variant={variant}>{variant}</Badge>)}
          </div>
        </Specimen>
      </div>

      <Specimen title="Data table (30 rows, sortable, paged)">
        <DataTable columns={COLUMNS} data={ROWS} searchKey="name" searchPlaceholder="Search learners..." />
      </Specimen>

      <Specimen title="Chart (series, grid and axis from the theme; flip the theme)">
        <LessonDropOffChart data={DROP_OFF} />
      </Specimen>

      <div className="grid gap-4 md:grid-cols-2">
        <Specimen title="Empty">
          <EmptyState
            icon={ClipboardCheck}
            title="No homework yet"
            description="Set the first piece and it shows up here, with who has handed it in."
            action={<Button><Plus aria-hidden="true" /> Set homework</Button>}
          />
        </Specimen>
        <Specimen title="Error (Retry spins for a second)">
          <RetryableError />
        </Specimen>
        <Specimen title="Loading: table">
          <TableSkeleton rows={4} columns={3} />
        </Specimen>
        <Specimen title="Loading: list and spinner">
          <ListSkeleton rows={2} />
          <LoadingSpinner />
        </Specimen>
      </div>
    </GallerySection>
  );
}
