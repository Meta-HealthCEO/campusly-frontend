'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  BookOpen,
  ChevronRight,
  X,
} from 'lucide-react';
import type { ChapterItem, ChapterResourceItem } from '@/types';

interface ChapterListProps {
  chapters: ChapterItem[];
  onAddChapter: () => void;
  onEditChapter: (chapter: ChapterItem) => void;
  onRemoveChapter: (chapterId: string) => void;
  onReorder: (chapterIds: string[]) => void;
  onAddResource: (chapterId: string) => void;
  onRemoveResource: (chapterId: string, resourceId: string) => void;
}

function resolveNodeLabel(
  node: ChapterItem['curriculumNodeId'],
): string | null {
  if (!node) return null;
  return typeof node === 'object' ? `${node.code} - ${node.title}` : null;
}

function resolveResourceLabel(
  res: ChapterResourceItem['resourceId'],
): string {
  return typeof res === 'object' ? res.title : res;
}

function resolveResourceType(
  res: ChapterResourceItem['resourceId'],
): string | null {
  return typeof res === 'object' ? res.type : null;
}

function resolveResourceId(res: ChapterResourceItem['resourceId']): string {
  return typeof res === 'object' ? res.id : res;
}

/* ── Single Chapter Row ─────────────────────────────────────── */

function ChapterRow({
  chapter,
  index,
  total,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddResource,
  onRemoveResource,
}: {
  chapter: ChapterItem;
  index: number;
  total: number;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddResource: () => void;
  onRemoveResource: (resourceId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nodeLabel = resolveNodeLabel(chapter.curriculumNodeId);

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground w-6 shrink-0">
            {chapter.order + 1}.
          </span>

          <button
            type="button"
            className="flex items-center gap-1 flex-1 min-w-0 text-left"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <ChevronRight
              className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
            <span className="font-medium truncate">{chapter.title}</span>
          </button>

          {chapter.resources.length > 0 && (
            <Badge variant="secondary" className="shrink-0">
              {chapter.resources.length}
            </Badge>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={index === 0}
              onClick={onMoveUp}
              aria-label="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={index === total - 1}
              onClick={onMoveDown}
              aria-label="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onEdit}
              aria-label="Edit chapter"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={onRemove}
              aria-label="Remove chapter"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Meta line */}
        {(chapter.description || nodeLabel) && (
          <div className="pl-8 space-y-0.5">
            {chapter.description && (
              <p className="text-xs text-muted-foreground truncate">
                {chapter.description}
              </p>
            )}
            {nodeLabel && (
              <p className="text-xs text-muted-foreground truncate">
                Node: {nodeLabel}
              </p>
            )}
          </div>
        )}

        {/* Expanded: resources */}
        {expanded && (
          <div className="pl-8 space-y-1.5 pt-1 border-t">
            {chapter.resources.length === 0 ? (
              <p className="text-xs text-muted-foreground">No resources yet</p>
            ) : (
              chapter.resources
                .slice()
                .sort((a: ChapterResourceItem, b: ChapterResourceItem) => a.order - b.order)
                .map((res: ChapterResourceItem) => {
                  const rid = resolveResourceId(res.resourceId);
                  const label = resolveResourceLabel(res.resourceId);
                  const rType = resolveResourceType(res.resourceId);
                  return (
                    <div
                      key={rid}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="truncate flex-1">{label}</span>
                      {rType && <Badge variant="outline" className="text-xs">{rType}</Badge>}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive shrink-0"
                        onClick={() => onRemoveResource(rid)}
                        aria-label="Remove resource"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })
            )}

            <Button
              size="sm"
              variant="outline"
              className="mt-1"
              onClick={onAddResource}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Resource
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main List ──────────────────────────────────────────────── */

export function ChapterList({
  chapters,
  onAddChapter,
  onEditChapter,
  onRemoveChapter,
  onReorder,
  onAddResource,
  onRemoveResource,
}: ChapterListProps) {
  const sorted = (chapters ?? []).slice().sort((a: ChapterItem, b: ChapterItem) => a.order - b.order);

  const move = (index: number, direction: -1 | 1) => {
    const ids = sorted.map((c: ChapterItem) => c.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onReorder(ids);
  };

  if (chapters.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={BookOpen}
          title="No chapters"
          description="Add your first chapter to get started."
        />
        <div className="flex justify-center">
          <Button onClick={onAddChapter}>
            <Plus className="h-4 w-4 mr-1" /> Add Chapter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((chapter: ChapterItem, idx: number) => (
        <ChapterRow
          key={chapter.id}
          chapter={chapter}
          index={idx}
          total={sorted.length}
          onEdit={() => onEditChapter(chapter)}
          onRemove={() => onRemoveChapter(chapter.id)}
          onMoveUp={() => move(idx, -1)}
          onMoveDown={() => move(idx, 1)}
          onAddResource={() => onAddResource(chapter.id)}
          onRemoveResource={(rid: string) => onRemoveResource(chapter.id, rid)}
        />
      ))}

      <Button variant="outline" className="w-full" onClick={onAddChapter}>
        <Plus className="h-4 w-4 mr-1" /> Add Chapter
      </Button>
    </div>
  );
}
