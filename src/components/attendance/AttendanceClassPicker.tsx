'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TeacherClassOption } from '@/hooks/useTeacherAttendance';

interface AttendanceClassPickerProps {
  classes: TeacherClassOption[];
  value: string | null;
  onChange: (classId: string) => void;
  disabled?: boolean;
}

export function AttendanceClassPicker({ classes, value, onChange, disabled }: AttendanceClassPickerProps) {
  if (classes.length === 0) return null;
  return (
    <Select
      value={value ?? ''}
      onValueChange={(v: unknown) => {
        if (typeof v === 'string' && v) onChange(v);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="Select class" />
      </SelectTrigger>
      <SelectContent>
        {classes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
