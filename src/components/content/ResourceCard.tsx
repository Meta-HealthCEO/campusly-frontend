'use client';

import { BookOpen, FileText, PenTool, Lightbulb, Zap, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ContentResourceItem, ResourceType, ResourceStatus } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  lesson: BookOpen,
  study_notes: FileText,
  worksheet: PenTool,
  worked_example: Lightbulb,
  activity: Zap,
};

const TYPE_LABELS: Record<ResourceType, string> = {
  lesson: 'Lesson',
  study_notes: 'Study Notes',
  worksheet: 'Worksheet',
  worked_example: 'Worked Example',
  activity: 'Activity',
};

const STATUS_VARIANT: Record<ResourceStatus, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  draft: 'secondary',
  pending_review: 'outline',
  approved: 'default',
  rejected: 'destructive',
};

const STATUS_LABELS: Record<ResourceStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

function resolveNodeTitle(node: ContentResourceItem['curriculumNodeId']): string {
  if (!node) return '';
  return typeof node === 'string' ? '' : node.title;
}

function resolveSubjectName(subject: ContentResourceItem['subjectId']): string {
  if (!subject) return '';
  return typeof subject === 'string' ? '' : subject.name;
}

function resolveCreatorName(creator: ContentResourceItem['createdBy']): string {
  if (!creator) return '';
  if (typeof creator === 'string') return '';
  return `${creator.firstName} ${creator.lastName}`;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ResourceCardProps {
  resource: ContentResourceItem;
  onClick: (resource: ContentResourceItem) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const Icon = TYPE_ICONS[resource.type];
  const nodeTitle = resolveNodeTitle(resource.curriculumNodeId);
  const subjectName = resolveSubjectName(resource.subjectId);
  const creatorName = resolveCreatorName(resource.createdBy);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(resource)}
    >
      <CardContent className="flex flex-col gap-3">
        {/* Header row: icon + title */}
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium truncate">{resource.title}</h4>
            {nodeTitle && (
              <p className="text-xs text-muted-foreground truncate">{nodeTitle}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={STATUS_VARIANT[resource.status]}>
            {STATUS_LABELS[resource.status]}
          </Badge>
          <Badge variant="secondary">
            {TYPE_LABELS[resource.type]}
          </Badge>
          {resource.source === 'ai_generated' && (
            <Badge variant="outline" className="gap-1">
              <Sparkles className="size-3" />
              AI
            </Badge>
          )}
          {subjectName && (
            <Badge variant="outline">{subjectName}</Badge>
          )}
        </div>

        {/* Creator */}
        {creatorName && (
          <p className="text-xs text-muted-foreground truncate">
            By {creatorName}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
