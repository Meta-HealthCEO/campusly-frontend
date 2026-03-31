'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import type { ApiHousePointLog, PopulatedStudent, PopulatedUser } from '@/hooks/useAchiever';

interface HousePointHistoryProps {
  logs: ApiHousePointLog[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  limit?: number;
}

function getStudentName(studentId: string | PopulatedStudent): string {
  if (typeof studentId === 'string') return studentId;
  const s = studentId;
  if (s.user) return `${s.user.firstName} ${s.user.lastName}`;
  if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
  return s.admissionNumber ?? 'Unknown';
}

function getAwarderName(awardedBy: string | PopulatedUser): string {
  if (typeof awardedBy === 'string') return awardedBy;
  return `${awardedBy.firstName} ${awardedBy.lastName}`;
}

export function HousePointHistory({ logs, total, page, onPageChange, loading, limit = 20 }: HousePointHistoryProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Point History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <EmptyState icon={History} title="No history" description="Point awards will appear here." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Awarded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="text-sm">{getStudentName(log.studentId)}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          log.points >= 0
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        )}>
                          {log.points >= 0 ? '+' : ''}{log.points}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{log.reason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{getAwarderName(log.awardedBy)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{total} total entries</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
