'use client';

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { StudentSelector } from '@/components/fees/StudentSelector';

interface AwardsFilterBarProps {
  typeFilter: string;
  onTypeChange: (type: string) => void;
  studentFilter: string;
  onStudentChange: (studentId: string) => void;
}

export function AwardsFilterBar({ typeFilter, onTypeChange, studentFilter, onStudentChange }: AwardsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1 w-40">
        <Select
          value={typeFilter || 'all'}
          onValueChange={(val: unknown) => onTypeChange((val as string) === 'all' ? '' : (val as string))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="sport">Sport</SelectItem>
            <SelectItem value="cultural">Cultural</SelectItem>
            <SelectItem value="behaviour">Behaviour</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-56">
        <StudentSelector
          value={studentFilter}
          onValueChange={onStudentChange}
          label=""
          placeholder="Filter by student..."
        />
      </div>
    </div>
  );
}
