'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import type { StudentProfileFormData } from '@/hooks/useStudentEditor';
import type { Student } from '@/types';

type EnrollmentStatus = NonNullable<StudentProfileFormData['enrollmentStatus']>;

interface Props {
  form: Partial<StudentProfileFormData>;
  student: Student;
  onChange: (patch: Partial<StudentProfileFormData>) => void;
}

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: 'Active',
  transferred: 'Transferred',
  graduated: 'Graduated',
  expelled: 'Expelled',
  withdrawn: 'Withdrawn',
};

export function EnrolmentEditTab({ form, student, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label>Enrollment Date</Label>
        <p className="text-sm py-2 text-muted-foreground">
          {student.enrollmentDate ? formatDate(student.enrollmentDate) : 'Not recorded'}
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="enrollmentStatus">Enrollment Status</Label>
        <Select
          value={form.enrollmentStatus ?? 'active'}
          onValueChange={(v: unknown) =>
            onChange({ enrollmentStatus: v as EnrollmentStatus })
          }
        >
          <SelectTrigger id="enrollmentStatus" className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as EnrollmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
