'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import type { TextbookItem, TextbookStatus } from '@/types';

interface TextbookCardProps {
  textbook: TextbookItem;
  onClick: (textbook: TextbookItem) => void;
}

const STATUS_VARIANT: Record<TextbookStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
};

function resolveLabel(field: string | { id: string; name: string }): string {
  return typeof field === 'object' ? field.name : '';
}

function resolveFrameworkLabel(
  field: string | { id: string; name: string },
): string {
  return typeof field === 'object' ? field.name : '';
}

export function TextbookCard({ textbook, onClick }: TextbookCardProps) {
  const subjectLabel = resolveLabel(textbook.subjectId);
  const gradeLabel = resolveLabel(textbook.gradeId);
  const frameworkLabel = resolveFrameworkLabel(textbook.frameworkId);
  const chapterCount = textbook.chapters?.length ?? 0;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(textbook)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base truncate">{textbook.title}</CardTitle>
          <Badge variant={STATUS_VARIANT[textbook.status]} className="shrink-0">
            {textbook.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Subject + Grade badges */}
        <div className="flex flex-wrap gap-1.5">
          {subjectLabel && <Badge variant="outline">{subjectLabel}</Badge>}
          {gradeLabel && <Badge variant="outline">{gradeLabel}</Badge>}
        </div>

        {/* Description */}
        {textbook.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {textbook.description}
          </p>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
          </span>
          {frameworkLabel && <span className="truncate max-w-[50%]">{frameworkLabel}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
