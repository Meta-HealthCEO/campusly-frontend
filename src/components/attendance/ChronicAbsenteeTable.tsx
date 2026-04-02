'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TrendingDown, TrendingUp, Minus, Users } from 'lucide-react';
import type { ChronicAbsentee } from '@/types';

interface ChronicAbsenteeTableProps {
  absentees: ChronicAbsentee[];
  loading: boolean;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
}

function TrendIcon({ trend }: { trend: ChronicAbsentee['trend'] }) {
  if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function ChronicAbsenteeTable({
  absentees, loading, threshold, onThresholdChange,
}: ChronicAbsenteeTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">Chronic Absentees</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Threshold:</span>
            <Select
              value={String(threshold)}
              onValueChange={(v: unknown) => onThresholdChange(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="80">80%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="70">70%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : absentees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No chronic absentees"
            description={`All students are above ${threshold}% attendance.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium text-muted-foreground">Student</th>
                  <th className="p-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Grade</th>
                  <th className="p-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Class</th>
                  <th className="p-2 text-center font-medium text-muted-foreground">Present</th>
                  <th className="p-2 text-center font-medium text-muted-foreground">Absent</th>
                  <th className="p-2 text-center font-medium text-muted-foreground hidden lg:table-cell">Late</th>
                  <th className="p-2 text-center font-medium text-muted-foreground">%</th>
                  <th className="p-2 text-center font-medium text-muted-foreground">Trend</th>
                </tr>
              </thead>
              <tbody>
                {absentees.map((student) => (
                  <tr
                    key={student.studentId}
                    className={`border-b last:border-0 ${
                      student.percentage < 70
                        ? 'bg-destructive/5'
                        : ''
                    }`}
                  >
                    <td className="p-2">
                      <span className="font-medium truncate block max-w-[200px]">
                        {student.studentName}
                      </span>
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {student.gradeName} {student.className}
                      </span>
                    </td>
                    <td className="p-2 hidden sm:table-cell">{student.gradeName}</td>
                    <td className="p-2 hidden sm:table-cell">{student.className}</td>
                    <td className="p-2 text-center">{student.presentDays}</td>
                    <td className="p-2 text-center text-destructive font-medium">
                      {student.absentDays}
                    </td>
                    <td className="p-2 text-center hidden lg:table-cell">{student.lateDays}</td>
                    <td className="p-2 text-center">
                      <Badge variant={student.percentage < 70 ? 'destructive' : 'secondary'}>
                        {student.percentage}%
                      </Badge>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex justify-center">
                        <TrendIcon trend={student.trend} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
