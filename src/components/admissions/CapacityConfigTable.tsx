'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GradeCapacity } from '@/types/admissions';

interface Props {
  capacities: GradeCapacity[];
  onSave: (grades: { grade: number; maxCapacity: number }[]) => Promise<void>;
  loading: boolean;
}

function gradeLabel(grade: number): string {
  return grade === 0 ? 'Grade R' : `Grade ${grade}`;
}

interface EditRow {
  grade: number;
  maxCapacity: number;
}

export function CapacityConfigTable({ capacities, onSave, loading }: Props) {
  const [rows, setRows] = useState<EditRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (capacities.length > 0) {
      setRows(capacities.map((c: GradeCapacity) => ({
        grade: c.grade,
        maxCapacity: c.maxCapacity,
      })));
    } else {
      // Default grades 0-12
      setRows(Array.from({ length: 13 }, (_: unknown, i: number) => ({
        grade: i,
        maxCapacity: 0,
      })));
    }
  }, [capacities]);

  const updateMax = (grade: number, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setRows((prev: EditRow[]) =>
      prev.map((r: EditRow) => (r.grade === grade ? { ...r, maxCapacity: num } : r)),
    );
  };

  const handleSave = async () => {
    const nonZero = rows.filter((r: EditRow) => r.maxCapacity > 0);
    if (nonZero.length === 0) return;
    setSaving(true);
    try {
      await onSave(nonZero);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading capacity data...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Grade</th>
              <th className="p-2 text-left">Max Capacity</th>
              <th className="p-2 text-left">Current Enrolled</th>
              <th className="p-2 text-left">Available</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: EditRow) => {
              const existing = capacities.find((c: GradeCapacity) => c.grade === row.grade);
              const enrolled = existing?.currentEnrolled ?? 0;
              const available = Math.max(0, row.maxCapacity - enrolled);
              return (
                <tr key={row.grade} className="border-b">
                  <td className="p-2 font-medium">{gradeLabel(row.grade)}</td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={0}
                      value={row.maxCapacity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateMax(row.grade, e.target.value)}
                      className="w-full sm:w-24"
                    />
                  </td>
                  <td className="p-2 text-muted-foreground">{enrolled}</td>
                  <td className="p-2 text-muted-foreground">{available}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Capacity'}
      </Button>
    </div>
  );
}
