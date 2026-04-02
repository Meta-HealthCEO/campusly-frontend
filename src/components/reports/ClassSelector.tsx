'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReports } from '@/hooks/useReports';
import type { ClassOption } from '@/hooks/useReports';

interface ClassSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClassSelector({ value, onChange }: ClassSelectorProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const { fetchClasses } = useReports();

  useEffect(() => {
    async function loadClasses() {
      const result = await fetchClasses();
      setClasses(result);
    }
    loadClasses();
  }, [fetchClasses]);

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
