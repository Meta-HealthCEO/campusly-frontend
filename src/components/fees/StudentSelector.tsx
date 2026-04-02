'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useStudentsList } from '@/hooks/useFeeDialogData';
import type { Student } from '@/types';

interface StudentSelectorProps {
  value: string;
  onValueChange: (studentId: string) => void;
  label?: string;
  placeholder?: string;
}

function getStudentName(s: Student): string {
  if (s.user) return `${s.user.firstName} ${s.user.lastName}`;
  if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
  return s.admissionNumber ?? 'Unknown';
}

export function StudentSelector({
  value,
  onValueChange,
  label = 'Student',
  placeholder = 'Select a student...',
}: StudentSelectorProps) {
  const { students, loading } = useStudentsList();

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(val: unknown) => onValueChange(val as string)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? 'Loading...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {students.map((s) => (
            <SelectItem key={s.id ?? s._id} value={s.id ?? s._id ?? ''}>
              {getStudentName(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { getStudentName };
export type { StudentSelectorProps };
