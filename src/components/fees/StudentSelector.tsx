'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import apiClient from '@/lib/api-client';
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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const response = await apiClient.get('/students');
        const raw = response.data.data ?? response.data;
        const list: Student[] = Array.isArray(raw) ? raw : raw.students ?? raw.data ?? [];
        setStudents(list);
      } catch {
        console.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

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
