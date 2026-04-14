'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StudentTermResult } from '@/types';

interface Props {
  student: StudentTermResult;
}

function fmtPct(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value * 10) / 10}%`;
}

export function TermMarksStudentCard({ student }: Props) {
  const [expanded, setExpanded] = useState(false);

  const termMark = student.projectedTermMark ?? student.finalTermMark;
  const badgeVariant = termMark === null ? 'secondary' : termMark >= 50 ? 'default' : 'destructive';

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="font-medium truncate mr-3">{student.studentName}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={badgeVariant}>
            {termMark === null ? 'Pending' : `${Math.round(termMark * 10) / 10}%`}
          </Badge>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t bg-muted/20">
          {student.categories.map((cat) => (
            <div key={cat.categoryId} className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{cat.name}</span>
                <span className="text-sm text-muted-foreground">{fmtPct(cat.score)}</span>
              </div>
              <div className="space-y-1 pl-2">
                {cat.lineItems.map((li) => (
                  <div key={li.lineItemId} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate mr-2">{li.name}</span>
                    <span className="shrink-0">
                      {li.isAbsent ? 'ABS' : li.percentage === null ? '—' : fmtPct(li.percentage)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
