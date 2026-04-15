'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles } from 'lucide-react';
import type { SuggestedSubstituteTeacher } from '@/types';

interface SuggestedTeachersListProps {
  suggestions: SuggestedSubstituteTeacher[];
  loading: boolean;
  onSelect: (id: string) => void;
  selectedId: string;
}

export function SuggestedTeachersList({
  suggestions, loading, onSelect, selectedId,
}: SuggestedTeachersListProps) {
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const visible = useMemo(
    () => (showOnlyAvailable ? suggestions.filter((s) => !s.reason) : suggestions),
    [suggestions, showOnlyAvailable],
  );

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading suggestions...</p>;
  }
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Suggested teachers
        </p>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Checkbox
            checked={showOnlyAvailable}
            onCheckedChange={(c: boolean) => setShowOnlyAvailable(c)}
          />
          Available only
        </label>
      </div>
      <div className="max-h-32 overflow-y-auto space-y-1">
        {visible.map((s) => {
          const selected = selectedId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`w-full text-left text-xs rounded px-2 py-1.5 transition-colors flex items-center justify-between gap-2 ${
                selected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <span className="truncate">
                {s.firstName} {s.lastName}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {s.preferred && (
                  <Badge variant="secondary" className="text-[10px] py-0">
                    Recommended
                  </Badge>
                )}
                {s.reason && (
                  <span className="text-[10px] text-muted-foreground">{s.reason}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
