'use client';

import type { SessionAttendanceRecord } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';

interface SessionAttendanceTableProps {
  records: SessionAttendanceRecord[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SessionAttendanceTable({ records }: SessionAttendanceTableProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No attendance records"
        description="No students have joined this session yet."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Joined At</TableHead>
            <TableHead>Left At</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Rejoins</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium truncate max-w-[160px]">
                {r.studentId.firstName} {r.studentId.lastName}
              </TableCell>
              <TableCell className="text-sm">{formatTime(r.joinedAt)}</TableCell>
              <TableCell className="text-sm">
                {r.leftAt ? formatTime(r.leftAt) : '—'}
              </TableCell>
              <TableCell className="text-sm">{formatDuration(r.duration)}</TableCell>
              <TableCell className="text-right text-sm">{r.rejoinCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
