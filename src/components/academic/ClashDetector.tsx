'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import type { TimetableClash } from '@/types';

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday',
};

interface ClashDetectorProps {
  clashes: TimetableClash[];
  loading: boolean;
  hasChecked: boolean;
  onCheck: () => void;
}

export function ClashDetector({ clashes, loading, hasChecked, onCheck }: ClashDetectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onCheck} disabled={loading} size="sm" variant="outline">
          <Search className="mr-1 h-4 w-4" />
          Check Clashes
        </Button>
        {hasChecked && (
          <Badge variant={clashes.length > 0 ? 'destructive' : 'secondary'}>
            {clashes.length} {clashes.length === 1 ? 'clash' : 'clashes'}
          </Badge>
        )}
      </div>

      {loading && <LoadingSpinner />}

      {hasChecked && !loading && clashes.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>No Clashes Detected</AlertTitle>
          <AlertDescription>
            All timetable entries are conflict-free.
          </AlertDescription>
        </Alert>
      )}

      {hasChecked && !loading && clashes.length > 0 && (
        <div className="space-y-2">
          {clashes.map((clash, idx) => (
            <Alert key={`${clash.type}-${clash.day}-${clash.period}-${idx}`} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {clash.type === 'teacher' ? 'Teacher Double-Booked' : 'Class Double-Booked'}
              </AlertTitle>
              <AlertDescription>
                {clash.type === 'teacher' ? (
                  <span>
                    <span className="font-medium">{clash.teacherName}</span> is double-booked on{' '}
                    <span className="font-medium">{DAY_LABELS[clash.day] ?? clash.day}</span>{' '}
                    Period {clash.period}:{' '}
                    {clash.conflictingEntries.map((e, i) => (
                      <span key={e.classId}>
                        {i > 0 && ' and '}
                        {e.className} ({e.subject})
                      </span>
                    ))}
                  </span>
                ) : (
                  <span>
                    <span className="font-medium">{clash.className}</span> has multiple subjects on{' '}
                    <span className="font-medium">{DAY_LABELS[clash.day] ?? clash.day}</span>{' '}
                    Period {clash.period}:{' '}
                    {clash.conflictingEntries.map((e, i) => (
                      <span key={`${e.classId}-${e.subject}`}>
                        {i > 0 && ' and '}
                        {e.subject}
                      </span>
                    ))}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
