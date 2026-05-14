'use client';

import { getStudentDisplayName } from '@/lib/student-helpers';
import type { AddStudentResult } from '@/hooks/useTeacherClasses';
import { StudentCredentialsPanel } from './StudentCredentialsPanel';
import type { DeliveryMode } from './StudentDeliveryModeToggle';

interface StudentAddCredentialsResultsProps {
  batch: AddStudentResult[];
  deliveryMode: DeliveryMode;
}

export function StudentAddCredentialsResults({ batch, deliveryMode }: StudentAddCredentialsResultsProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div>
        <h3 className="text-sm font-semibold">Student portal login details</h3>
        <p className="text-xs text-muted-foreground">
          Share these details with the student or parent. Passwords are shown once here.
        </p>
      </div>
      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
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
