'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookCover } from './BookCover';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import type { TextbookItem } from '@/types';

interface TextbookShelfViewProps {
  textbooks: TextbookItem[];
}

function resolveLabel(field: string | { id: string; name: string }): string {
  return typeof field === 'object' ? field.name : '';
}

function gradeNum(name: string): number {
  const m = name.match(/\d+/);
  return m ? parseInt(m[0], 10) : -1;
}

interface GradeGroup {
  gradeName: string;
  gradeSort: number;
  books: TextbookItem[];
}

export function TextbookShelfView({ textbooks }: TextbookShelfViewProps) {
  const router = useRouter();

  const gradeGroups = useMemo<GradeGroup[]>(() => {
    const map = new Map<string, TextbookItem[]>();
    for (const tb of textbooks) {
      const name = resolveLabel(tb.gradeId);
      if (!name) continue;
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(tb);
    }
    return Array.from(map.entries())
      .map(([gradeName, books]) => ({
        gradeName,
        gradeSort: gradeNum(gradeName),
        books: books.sort((a, b) =>
          resolveLabel(a.subjectId).localeCompare(resolveLabel(b.subjectId)),
        ),
      }))
      .sort((a, b) => b.gradeSort - a.gradeSort);
  }, [textbooks]);

  if (gradeGroups.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No textbooks found"
        description="Create your first textbook or adjust filters."
      />
    );
  }

  return (
    <div className="space-y-8">
      {gradeGroups.map((group) => (
        <div key={group.gradeName}>
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="font-bold text-sm tracking-tight">{group.gradeName}</h3>
            <span className="text-xs text-muted-foreground">
              {group.books.length} {group.books.length === 1 ? 'textbook' : 'textbooks'}
            </span>
          </div>
          <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 scrollbar-thin">
            {group.books.map((tb) => (
              <BookCover
                key={tb.id}
                subjectName={resolveLabel(tb.subjectId)}
                gradeName={group.gradeName}
                chapterCount={tb.chapters?.length ?? 0}
                onClick={() => router.push(`/teacher/curriculum/textbooks/${tb.id}`)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
