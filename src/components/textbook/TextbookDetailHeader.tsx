'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, Globe, Archive, Eye } from 'lucide-react';
import type { TextbookItem, TextbookStatus } from '@/types';

interface TextbookDetailHeaderProps {
  textbook: TextbookItem;
  onBack: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
}

const STATUS_VARIANT: Record<TextbookStatus, 'secondary' | 'default' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'outline',
};

function resolveLabel(field: string | { id: string; name: string }): string {
  return typeof field === 'object' ? field.name : '';
}

export function TextbookDetailHeader({
  textbook,
  onBack,
  onEdit,
  onPublish,
  onArchive,
}: TextbookDetailHeaderProps) {
  const subjectLabel = resolveLabel(textbook.subjectId);
  const gradeLabel = resolveLabel(textbook.gradeId);

  return (
    <div className="space-y-3">
      {/* Back + Title row */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to list">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold truncate">{textbook.title}</h2>
            <Badge variant={STATUS_VARIANT[textbook.status]}>{textbook.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {subjectLabel && <Badge variant="outline">{subjectLabel}</Badge>}
            {gradeLabel && <Badge variant="outline">{gradeLabel}</Badge>}
          </div>
        </div>
      </div>

      {/* Description */}
      {textbook.description && (
        <p className="text-sm text-muted-foreground pl-11">{textbook.description}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pl-11">
        <Button size="sm" onClick={() => window.open(`/student/learn/textbooks/${textbook.id}`, '_blank')}>
          <Eye className="h-4 w-4 mr-1" /> Preview Textbook
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1" /> Edit Metadata
        </Button>
        {textbook.status === 'draft' && (
          <Button size="sm" onClick={onPublish}>
            <Globe className="h-4 w-4 mr-1" /> Publish
          </Button>
        )}
        {textbook.status === 'published' && (
          <Button variant="outline" size="sm" onClick={onArchive}>
            <Archive className="h-4 w-4 mr-1" /> Archive
          </Button>
        )}
      </div>
    </div>
  );
}
