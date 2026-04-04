'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurriculumTree } from '@/hooks/useCurriculumTree';
import type { CurriculumNodeItem, CurriculumNodeType } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CurriculumTreeBrowserProps {
  frameworkId: string;
  onSelect: (node: CurriculumNodeItem) => void;
  selectedNodeId?: string | null;
}

interface TreeNodeRowProps {
  node: CurriculumNodeItem;
  depth: number;
  expanded: Set<string>;
  onToggle: (nodeId: string) => Promise<void>;
  onSelect: (node: CurriculumNodeItem) => void;
  selectedNodeId?: string | null;
  getChildren: (parentId: string | null) => CurriculumNodeItem[] | undefined;
  isLoading: (parentId: string | null) => boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAF_TYPES: CurriculumNodeType[] = ['subtopic', 'outcome'];

const NODE_TYPE_COLORS: Record<CurriculumNodeType, string> = {
  phase:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  grade:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  subject: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  term:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  topic:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  subtopic:'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  outcome: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

// ─── Tree Node Row ────────────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  depth,
  expanded,
  onToggle,
  onSelect,
  selectedNodeId,
  getChildren,
  isLoading,
}: TreeNodeRowProps) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedNodeId === node.id;
  const leaf = LEAF_TYPES.includes(node.type);
  const children = getChildren(node.id);
  const childrenLoading = isLoading(node.id);

  const handleRowClick = () => {
    if (leaf) {
      onSelect(node);
    } else {
      void onToggle(node.id);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={[
          'flex items-center gap-2 rounded-md py-2 pr-3 cursor-pointer transition-colors group',
          'hover:bg-muted',
          isSelected
            ? 'bg-primary/10 border-l-2 border-primary'
            : 'border-l-2 border-transparent',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick();
          }
        }}
      >
        {/* Chevron / spinner */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {childrenLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : !leaf ? (
            <ChevronRight
              className={[
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-150',
                isExpanded ? 'rotate-90' : '',
              ].join(' ')}
            />
          ) : null}
        </span>

        {/* Type badge */}
        <span
          className={[
            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none',
            NODE_TYPE_COLORS[node.type],
          ].join(' ')}
        >
          {node.type}
        </span>

        {/* Title */}
        <span className="flex-1 truncate text-sm">{node.title}</span>

        {/* Code */}
        {node.code && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {node.code}
          </span>
        )}

        {/* Select button (non-leaf, shown on hover) */}
        {!leaf && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 py-0 text-[10px] opacity-0 group-hover:opacity-100 focus:opacity-100"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node);
            }}
          >
            Select
          </Button>
        )}
      </div>

      {/* Children rows */}
      {isExpanded && children && children.length > 0 && (
        <div>
          {children.map((child: CurriculumNodeItem) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedNodeId={selectedNodeId}
              getChildren={getChildren}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* Empty state for expanded node */}
      {isExpanded && children && children.length === 0 && !childrenLoading && (
        <p
          className="py-1 text-[11px] text-muted-foreground"
          style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}
        >
          No items
        </p>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CurriculumTreeBrowser({
  frameworkId,
  onSelect,
  selectedNodeId,
}: CurriculumTreeBrowserProps) {
  const { getChildren, fetchChildren, isLoading } = useCurriculumTree(frameworkId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Load root nodes on mount / frameworkId change
  useEffect(() => {
    if (frameworkId) {
      void fetchChildren(null);
      setExpanded(new Set());
    }
  }, [frameworkId, fetchChildren]);

  const handleToggle = useCallback(
    async (nodeId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });

      // Pre-fetch children if not yet in cache
      if (getChildren(nodeId) === undefined) {
        await fetchChildren(nodeId);
      }
    },
    [getChildren, fetchChildren],
  );

  const rootNodes = getChildren(null);
  const rootLoading = isLoading(null);

  if (rootLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="text-sm">Loading curriculum...</span>
      </div>
    );
  }

  if (!rootNodes || rootNodes.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No curriculum nodes found for this framework.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[320px] space-y-0.5">
        {rootNodes.map((node: CurriculumNodeItem) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={handleToggle}
            onSelect={onSelect}
            selectedNodeId={selectedNodeId}
            getChildren={getChildren}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
