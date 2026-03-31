'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { UserCheck } from 'lucide-react';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';

interface AbsenteeRecord {
  _id: string;
  studentId: {
    _id: string;
    admissionNumber?: string;
    userId?: {
      firstName?: string;
      lastName?: string;
    };
  } | string;
  classId: {
    _id: string;
    name?: string;
  } | string;
  date: string;
  period: number;
  status: string;
}

interface AbsenteeListProps {
  absentees: AbsenteeRecord[];
}

function getStudentName(record: AbsenteeRecord): string {
  if (typeof record.studentId === 'object' && record.studentId !== null) {
    const s = record.studentId;
    const u = s.userId;
    if (u && typeof u === 'object') {
      return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || s.admissionNumber || 'Unknown';
    }
    return s.admissionNumber || 'Unknown';
  }
  return 'Unknown';
}

function getClassName(record: AbsenteeRecord): string {
  if (typeof record.classId === 'object' && record.classId !== null) {
    return record.classId.name || 'Unknown';
  }
  return 'Unknown';
}

export function AbsenteeList({ absentees }: AbsenteeListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Absentees &amp; Late Arrivals</CardTitle>
      </CardHeader>
      <CardContent>
        {absentees.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No absentees"
            description="All students are present today."
          />
        ) : (
          <div className="space-y-2">
            {absentees.map((record) => (
              <div
                key={record._id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{getStudentName(record)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getClassName(record)} - Period {record.period}
                  </p>
                </div>
                <AttendanceStatusBadge status={record.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
