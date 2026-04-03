'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Department {
  id: string;
  name: string;
}

interface DepartmentSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
  departments: Department[];
}

export function DepartmentSelector({ value, onChange, departments }: DepartmentSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label>Department / Subject</Label>
      <Select
        value={value ?? 'none'}
        onValueChange={(v: unknown) => onChange((v as string) === 'none' ? null : (v as string))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select department..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No department</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
