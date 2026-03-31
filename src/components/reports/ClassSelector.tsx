'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import apiClient from '@/lib/api-client';

interface ClassOption {
  id: string;
  name: string;
}

interface ClassSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClassSelector({ value, onChange }: ClassSelectorProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await apiClient.get('/academic/classes');
        const raw = response.data.data ?? response.data;
        const arr = Array.isArray(raw) ? raw : raw.data ?? [];
        setClasses(
          arr.map((c: Record<string, unknown>) => ({
            id: (c._id as string) ?? (c.id as string) ?? '',
            name: (c.name as string) ?? 'Unknown',
          }))
        );
      } catch {
        console.error('Failed to load classes');
      }
    }
    fetchClasses();
  }, []);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Class</label>
      <Select value={value || undefined} onValueChange={(v: unknown) => onChange(v as string)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All classes" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
