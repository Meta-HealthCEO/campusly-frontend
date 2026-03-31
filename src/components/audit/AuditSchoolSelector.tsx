'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuditStore } from '@/stores/useAuditStore';
import apiClient from '@/lib/api-client';

interface School {
  _id: string;
  name: string;
}

export function AuditSchoolSelector() {
  const [schools, setSchools] = useState<School[]>([]);
  const { filters, setFilter, fetchLogs } = useAuditStore();

  useEffect(() => {
    async function loadSchools() {
      try {
        const res = await apiClient.get('/schools');
        const raw = res.data.data ?? res.data;
        const arr: School[] = Array.isArray(raw) ? raw : raw.schools ?? [];
        setSchools(arr);
      } catch {
        console.error('Failed to load schools');
      }
    }
    loadSchools();
  }, []);

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
