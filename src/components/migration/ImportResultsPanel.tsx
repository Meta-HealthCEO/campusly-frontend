'use client';

import { StatCard } from '@/components/shared/StatCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, UserCheck, GraduationCap, Layers, SkipForward, AlertTriangle } from 'lucide-react';
import type { ImportResults } from '@/types/migration';

interface ImportResultsPanelProps {
  results: ImportResults;
}

export function ImportResultsPanel({ results }: ImportResultsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Students Created"
          value={results.studentsCreated.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Parents Created"
          value={results.parentsCreated.toLocaleString()}
          icon={UserCheck}
        />
        <StatCard
          title="Staff Created"
          value={results.staffCreated.toLocaleString()}
          icon={UserCheck}
        />
        <StatCard
          title="Grades Created"
          value={results.gradesCreated.toLocaleString()}
          icon={GraduationCap}
        />
        <StatCard
          title="Skipped (Duplicates)"
          value={results.skipped.toLocaleString()}
          icon={SkipForward}
          className={results.skipped > 0 ? 'border-yellow-200 dark:border-yellow-800' : ''}
        />
        <StatCard
          title="Total Records"
          value={(
            results.studentsCreated +
            results.parentsCreated +
            results.staffCreated +
            results.gradesCreated
          ).toLocaleString()}
          icon={Layers}
        />
      </div>

      {results.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Import Errors ({results.errors.length})
          </h4>
          <div className="max-h-48 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.errors.map((err, i) => (
                  <TableRow key={`${err.row}-${err.field}-${i}`}>
                    <TableCell className="font-mono text-xs">{err.row}</TableCell>
                    <TableCell className="text-xs">{err.field}</TableCell>
                    <TableCell className="text-xs">{err.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
