'use client';

import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuditStore } from '@/stores/useAuditStore';
import { useAuditApi } from '@/hooks/useAuditApi';

export function AuditSchoolSelector() {
  const { schools, filters, setFilter } = useAuditStore();
  const { fetchLogs, fetchSchools } = useAuditApi();

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleChange = (val: unknown) => {
    const schoolId = val as string;
    setFilter({ schoolId: schoolId || undefined });
    fetchLogs();
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">School</Label>
      <Select
        value={filters.schoolId ?? ''}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All schools" />
        </SelectTrigger>
        <SelectContent>
          {schools.map((school) => (
            <SelectItem key={school._id} value={school._id}>
              {school.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
