'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import type { TextbookItem, TextbookStatus } from '@/types';

interface TextbookListViewProps {
  textbooks: TextbookItem[];
}

function resolveLabel(field: string | { id: string; name: string }): string {
  return typeof field === 'object' ? field.name : '';
}

function gradeNum(name: string): number {
  const m = name.match(/\d+/);
  return m ? parseInt(m[0], 10) : -1;
}

const STATUS_VARIANT: Record<TextbookStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
};

export function TextbookListView({ textbooks }: TextbookListViewProps) {
  const router = useRouter();

  const sorted = useMemo(
    () =>
      [...textbooks].sort((a, b) => {
        const ga = gradeNum(resolveLabel(a.gradeId));
        const gb = gradeNum(resolveLabel(b.gradeId));
        if (gb !== ga) return gb - ga;
        return resolveLabel(a.subjectId).localeCompare(resolveLabel(b.subjectId));
      }),
    [textbooks],
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No textbooks found"
        description="Create your first textbook or adjust filters."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-4 py-2.5 font-semibold text-muted-foreground">Title</th>
            <th className="px-4 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Subject</th>
            <th className="px-4 py-2.5 font-semibold text-muted-foreground">Grade</th>
            <th className="px-4 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Chapters</th>
            <th className="px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((tb) => (
            <tr
              key={tb.id}
              onClick={() => router.push(`/teacher/curriculum/textbooks/${tb.id}`)}
              className="border-b cursor-pointer transition-colors hover:bg-muted/30"
            >
              <td className="px-4 py-2.5 font-medium truncate max-w-[250px]">{tb.title}</td>
              <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{resolveLabel(tb.subjectId)}</td>
              <td className="px-4 py-2.5">{resolveLabel(tb.gradeId)}</td>
              <td className="px-4 py-2.5 hidden sm:table-cell">{tb.chapters?.length ?? 0}</td>
              <td className="px-4 py-2.5">
                <Badge variant={STATUS_VARIANT[tb.status]} className="text-xs">
                  {tb.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
