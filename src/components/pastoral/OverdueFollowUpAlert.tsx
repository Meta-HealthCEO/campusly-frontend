'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { CounselorCaseload } from '@/types';

interface OverdueFollowUpAlertProps {
  overdueList: CounselorCaseload['overdueList'];
}

export function OverdueFollowUpAlert({ overdueList }: OverdueFollowUpAlertProps) {
  if (overdueList.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>
        {overdueList.length} Overdue Follow-Up{overdueList.length !== 1 ? 's' : ''}
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-0.5">
          {overdueList.map(
            (item: CounselorCaseload['overdueList'][number]) => (
              <li key={item.studentId.id} className="text-sm">
                <span className="font-medium">
                  {item.studentId.firstName} {item.studentId.lastName}
                </span>
                {' — '}
                {item.daysPastDue} day{item.daysPastDue !== 1 ? 's' : ''} past due
              </li>
            ),
          )}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
