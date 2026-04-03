'use client';

import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CurriculumNodeItem } from '@/types';

interface NodeTreeItemProps {
  node: CurriculumNodeItem;
  children: CurriculumNodeItem[];
  level: number;
  onExpand: (nodeId: string) => void;
  onEdit: (node: CurriculumNodeItem) => void;
  onDelete: (node: CurriculumNodeItem) => void;
  onAddChild: (parentNode: CurriculumNodeItem) => void;
  expandedNodes: Set<string>;
  childrenMap: Map<string, CurriculumNodeItem[]>;
  isAdmin: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  phase: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  grade: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  subject: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  term: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  topic: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  subtopic: 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300',
  outcome: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

export function NodeTreeItem({
  node,
  children,
  level,
  onExpand,
  onEdit,
  onDelete,
  onAddChild,
  expandedNodes,
  childrenMap,
  isAdmin,
}: NodeTreeItemProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = children.length > 0;
  const paddingLeft = level * 24;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center"
          onClick={() => onExpand(node.id)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[node.type] ?? ''}`}>
          {node.type}
        </Badge>

        <span className="flex-1 truncate text-sm font-medium">{node.title}</span>

        <span className="hidden text-xs text-muted-foreground group-hover:inline">
          {node.code}
        </span>

        {isAdmin && (
          <div className="hidden gap-0.5 group-hover:flex">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddChild(node)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(node)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(node)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {isExpanded &&
        children.map((child) => (
          <NodeTreeItem
            key={child.id}
            node={child}
            children={childrenMap.get(child.id) ?? []}
            level={level + 1}
            onExpand={onExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            expandedNodes={expandedNodes}
            childrenMap={childrenMap}
            isAdmin={isAdmin}
          />
        ))}
    </div>
  );
}
