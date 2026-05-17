'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { getStudentDisplayName } from '@/lib/student-helpers';
import type { AddStudentResult } from '@/hooks/useTeacherClasses';
import { StudentCredentialsPanel } from './StudentCredentialsPanel';
import type { DeliveryMode } from './StudentDeliveryModeToggle';

interface StudentAddCredentialsResultsProps {
  batch: AddStudentResult[];
  deliveryMode: DeliveryMode;
}

export function StudentAddCredentialsResults({ batch, deliveryMode }: StudentAddCredentialsResultsProps) {
  const count = batch.filter((b) => b.credentials).length;
  return (
    <div className="space-y-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <h3 className="text-base font-semibold">
            {count === 1 ? 'Login details ready' : `Login details ready for ${count} students`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {deliveryMode === 'email'
              ? 'We have emailed the credentials to each student. Copy them below as a backup — passwords are shown only once.'
              : 'Copy or print the credentials below — passwords are shown only once.'}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Once you close this dialog the temporary password cannot be retrieved. Copy or print it now, then share with the student or parent.
        </span>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {batch.map(({ student, credentials }) => {
          if (!credentials) return null;
          return (
            <StudentCredentialsPanel
              key={`${student.id}-${credentials.loginEmail}`}
              credentials={credentials}
              deliveryMode={deliveryMode}
              studentId={student.id}
              studentName={getStudentDisplayName(student).full}
              onPrintSlip={deliveryMode === 'slip'
                ? () => window.open(`/teacher/students/${student.id}/credentials/print`, '_blank')
                : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
