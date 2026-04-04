'use client';

import { BookOpen, FileText, PenTool, Lightbulb, Zap, Sparkles, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RESOURCE_STATUS_VARIANT, RESOURCE_STATUS_LABELS, RESOURCE_TYPE_LABELS } from '@/lib/design-system';
import type { ContentResourceItem, ResourceType, ResourceStatus } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  lesson: BookOpen,
  study_notes: FileText,
  worksheet: PenTool,
  worked_example: Lightbulb,
  activity: Zap,
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
  onAssign?: (resource: ContentResourceItem) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ResourceCard({ resource, onClick, onAssign }: ResourceCardProps) {
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
          <Badge variant={RESOURCE_STATUS_VARIANT[resource.status as ResourceStatus]}>
            {RESOURCE_STATUS_LABELS[resource.status as ResourceStatus]}
          </Badge>
          <Badge variant="secondary">
            {RESOURCE_TYPE_LABELS[resource.type]}
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

        {/* Footer: creator + assign button */}
        <div className="flex items-center justify-between">
          {creatorName ? (
            <p className="text-xs text-muted-foreground truncate">
              By {creatorName}
            </p>
          ) : (
            <span />
          )}
          {onAssign && resource.status === 'approved' && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onAssign(resource);
              }}
            >
              <ClipboardList className="mr-1 h-3.5 w-3.5" />
              Assign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
