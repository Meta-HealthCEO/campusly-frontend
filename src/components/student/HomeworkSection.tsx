'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StudentHomeworkItem } from '@/hooks/useStudentHomework';

interface Props {
  title: string;
  items: StudentHomeworkItem[];
  defaultOpen?: boolean;
  variant?: 'default' | 'destructive';
  empty?: ReactNode;
}

function statusLabel(hw: StudentHomeworkItem): string {
  if (hw.status === 'graded' && hw.mark != null) {
    return `${hw.mark}/${hw.totalMarks ?? '?'}`;
  }
  return hw.status;
}

function statusBadgeVariant(hw: StudentHomeworkItem): 'default' | 'outline' | 'destructive' {
  if (hw.status === 'graded') return 'default';
  if (hw.status === 'overdue') return 'destructive';
  return 'outline';
}

export function HomeworkSection({
  title,
  items,
  defaultOpen = true,
  variant = 'default',
  empty,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0 && !empty) return null;

  const headerClass = [
    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold',
    variant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-muted',
  ].join(' ');

  function rowKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/student/homework/${id}`);
    }
  }

  return (
    <section className="space-y-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className={headerClass}>
        <span>
          {title} ({items.length})
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        items.length === 0 ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {empty}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Title</th>
                  <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Subject</th>
                  <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Due</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((hw) => (
                  <tr
                    key={hw.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/student/homework/${hw.id}`)}
                    onKeyDown={(e) => rowKeyDown(e, hw.id)}
                    className="cursor-pointer border-t transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="font-medium">{hw.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:hidden">
                        {hw.subject && <span>{hw.subject}</span>}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(hw.dueAt).toLocaleDateString()}
                        </span>
                      </div>
                      {hw.sourceLesson && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          From: {hw.sourceLesson.title}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 align-middle text-muted-foreground sm:table-cell">
                      {hw.subject || '—'}
                    </td>
                    <td className="hidden px-4 py-3 align-middle text-muted-foreground sm:table-cell">
                      {new Date(hw.dueAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <Badge variant={statusBadgeVariant(hw)} className="capitalize">
                        {statusLabel(hw)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
