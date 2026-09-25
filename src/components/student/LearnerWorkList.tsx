import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dueText } from '@/lib/standalone-today';
import type { WorkRow } from '@/lib/learner-work';

const STATE: Record<WorkRow['state'], { label: string; variant: 'destructive' | 'attention' | 'info' | 'success' }> = {
  overdue: { label: 'Overdue', variant: 'destructive' },
  todo: { label: 'To do', variant: 'attention' },
  submitted: { label: 'Submitted', variant: 'info' },
  marked: { label: 'Marked', variant: 'success' },
};

function Rows({ title, rows, now }: { title: string; rows: WorkRow[]; now: Date }) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {rows.map((r: WorkRow) => (
            <li key={`${r.kind}:${r.id}`}>
              <Link href={r.href} className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[r.kind === 'project' ? 'Project' : null, r.subject || null, r.dueAt ? dueText(r.dueAt, now) : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Badge variant={STATE[r.state].variant}>{r.markLabel ?? STATE[r.state].label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Homework and projects in one list (spec §2). Status is a dot and a word; every surface neutral. */
export function LearnerWorkList({ todo, done, now }: { todo: WorkRow[]; done: WorkRow[]; now: Date }) {
  return (
    <div className="space-y-6">
      <Rows title="To do" rows={todo} now={now} />
      <Rows title="Done" rows={done} now={now} />
    </div>
  );
}
