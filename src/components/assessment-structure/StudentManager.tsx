'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Users, UserPlus, UserMinus } from 'lucide-react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  studentIds: string[];
  onAdd: (ids: string[]) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  allStudents: Student[];
  studentsLoading: boolean;
}

export function StudentManager({
  studentIds,
  onAdd,
  onRemove,
  allStudents,
  studentsLoading,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const enrolled = allStudents.filter((s) => studentIds.includes(s.id));
  const available = allStudents.filter((s) => !studentIds.includes(s.id));

  const handleRemove = async (id: string) => {
    setBusy(id);
    try {
      await onRemove(id);
    } finally {
      setBusy(null);
    }
  };

  const handleAdd = async (ids: string[]) => {
    const key = ids.join(',');
    setBusy(key);
    try {
      await onAdd(ids);
    } finally {
      setBusy(null);
    }
  };

  const handleAddAll = async () => {
    if (available.length === 0) return;
    await handleAdd(available.map((s) => s.id));
  };

  if (studentsLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* Enrolled students */}
      <div className="border rounded-md p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">
            Enrolled Students
            <span className="ml-1 text-muted-foreground">({enrolled.length})</span>
          </h3>
        </div>

        {enrolled.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No enrolled students"
            description="Add students from the available list."
          />
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {enrolled.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm truncate">
                  {s.firstName} {s.lastName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy === s.id}
                  onClick={() => handleRemove(s.id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                  aria-label={`Remove ${s.firstName} ${s.lastName}`}
                >
                  <UserMinus className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Available students */}
      <div className="border rounded-md p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-sm">
            Available Students
            <span className="ml-1 text-muted-foreground">({available.length})</span>
          </h3>
          {available.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={handleAddAll}
              className="shrink-0"
            >
              Add All
            </Button>
          )}
        </div>

        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            All students are enrolled.
          </p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {available.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm truncate">
                  {s.firstName} {s.lastName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy === s.id || busy === available.map((x) => x.id).join(',')}
                  onClick={() => handleAdd([s.id])}
                  className="shrink-0"
                  aria-label={`Add ${s.firstName} ${s.lastName}`}
                >
                  <UserPlus className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
