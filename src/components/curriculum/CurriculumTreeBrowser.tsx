'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurriculumTree } from '@/hooks/useCurriculumTree';
import { displayNodeTitle } from '@/lib/curriculum-display';
import type { CurriculumNodeItem, CurriculumNodeType } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CurriculumTreeBrowserSelectContext {
  ancestors: CurriculumNodeItem[];
  getNodeById: (id: string) => CurriculumNodeItem | undefined;
}

export interface CurriculumTreeBrowserProps {
  frameworkId: string;
  onSelect: (
    node: CurriculumNodeItem,
    ctx?: CurriculumTreeBrowserSelectContext,
  ) => void;
  selectedNodeId?: string | null;
  selectedNodeIds?: string[];
}

interface TreeNodeRowProps {
  node: CurriculumNodeItem;
  depth: number;
  expanded: Set<string>;
  onToggle: (nodeId: string) => Promise<void>;
  onSelect: (node: CurriculumNodeItem) => void;
  selectedNodeId?: string | null;
  selectedNodeIds?: string[];
  getChildren: (parentId: string | null) => CurriculumNodeItem[] | undefined;
  isLoading: (parentId: string | null) => boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAF_TYPES: CurriculumNodeType[] = ['subtopic', 'outcome'];

// Phase code → seniority rank. Highest rank renders first so the FET phase
// (Grades 10-12) appears at the top of the root list.
const PHASE_RANK: Record<string, number> = { FET: 4, SP: 3, IP: 2, FP: 1 };

function parsePhaseRank(node: CurriculumNodeItem): number {
  const source = `${node.code ?? ''} ${node.title ?? ''}`;
  const m = source.match(/\b(FET|SP|IP|FP)\b/i);
  return PHASE_RANK[m?.[1]?.toUpperCase() ?? ''] ?? 0;
}

function parseGradeNum(node: CurriculumNodeItem): number {
  const source = `${node.code ?? ''} ${node.title ?? ''}`;
  const m = source.match(/GR(?:ADE)?\s*0?(\d{1,2})/i);
  return m ? Number(m[1]) : -1;
}

// Sort siblings descending for the ordinal navigation tiers only: phase by
// seniority (FET → FP), grade by number (12 → R). Subjects, terms, topics,
// subtopics and outcomes keep the backend's natural order — term 1 → 4 is
// chronological, subjects alphabetical, topics pedagogically ordered.
function sortSiblingsDesc(nodes: CurriculumNodeItem[]): CurriculumNodeItem[] {
  const first = nodes[0];
  if (!first) return nodes;
  if (first.type === 'phase') {
    return [...nodes].sort((a, b) => parsePhaseRank(b) - parsePhaseRank(a));
  }
  if (first.type === 'grade') {
    return [...nodes].sort((a, b) => parseGradeNum(b) - parseGradeNum(a));
  }
  return nodes;
}

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
  selectedNodeIds,
  getChildren,
  isLoading,
}: TreeNodeRowProps) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedNodeId === node.id || Boolean(selectedNodeIds?.includes(node.id));
  const children = getChildren(node.id);
  const childrenLoading = isLoading(node.id);
  const isKnownEmptyTopic = node.type === 'topic' && children && children.length === 0;
  const leaf = LEAF_TYPES.includes(node.type) || isKnownEmptyTopic;

  const handleRowClick = () => {
    // Leaf rows (subtopic/outcome, plus topics with no children) select on
    // row click — there's nothing to expand. All other rows, including
    // topics with subtopics, only toggle expansion; the "Select" button on
    // the right handles selection so the user doesn't accidentally select
    // the parent topic when drilling down to its subtopics.
    if (leaf) {
      onSelect(node);
      return;
    }
    void onToggle(node.id);
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
            ? 'bg-primary/10 border-l-2 border-primary ring-1 ring-primary/20'
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

        {/* Title — friendlied via displayNodeTitle because some seeded
             curricula store code-shaped titles like "CAPS-MATHEMATICS-GR1". */}
        <span className={['flex-1 truncate text-sm', isSelected ? 'font-semibold' : ''].join(' ')}>
          {displayNodeTitle(node)}
        </span>

        {/* Code column intentionally omitted — the curriculum codes are long
            internal identifiers (e.g. CAPS-ACCOUNTING-GR12-T1-COMPANIES-01)
            that crowd every row without telling the user anything they don't
            already see from the title + type badge. */}

        {/* Select button for nodes that can be used directly for generation. */}
        {(node.type === 'topic' || !leaf) && (
          <Button
            variant="ghost"
            size="sm"
            className={[
              'h-6 shrink-0 px-2 py-0 text-[10px]',
              node.type === 'topic'
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
            ].join(' ')}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node);
            }}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        )}
      </div>

      {/* Children rows — sorted descending where it makes sense (phase by
           seniority, grade by number, term by number). */}
      {isExpanded && children && children.length > 0 && (
        <div>
          {sortSiblingsDesc(children).map((child: CurriculumNodeItem) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedNodeId={selectedNodeId}
              selectedNodeIds={selectedNodeIds}
              getChildren={getChildren}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* Empty state for expanded node */}
      {isExpanded && isKnownEmptyTopic && !childrenLoading && (
        <div
          className="py-1 text-[11px] text-muted-foreground"
          style={{ paddingLeft: `${(depth + 1) * 20 + 12}px` }}
        >
          No smaller CAPS subtopics. Select this topic to generate from its description.
        </div>
      )}

      {isExpanded && children && children.length === 0 && !childrenLoading && !isKnownEmptyTopic && (
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
  selectedNodeIds,
}: CurriculumTreeBrowserProps) {
  const { getChildren, fetchChildren, isLoading, resolveAncestors, getNodeById } =
    useCurriculumTree(frameworkId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleSelect = useCallback(
    async (node: CurriculumNodeItem) => {
      // Emit immediately for snappy UI; ancestors arrive asynchronously.
      onSelect(node, { ancestors: [], getNodeById });
      const ancestors = await resolveAncestors(node);
      if (ancestors.length > 0) onSelect(node, { ancestors, getNodeById });
    },
    [onSelect, resolveAncestors, getNodeById],
  );

  // Load root nodes on mount / frameworkId change
  useEffect(() => {
    if (frameworkId) {
      void fetchChildren(null);
      setExpanded(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameworkId]);

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
        {sortSiblingsDesc(rootNodes).map((node: CurriculumNodeItem) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={handleToggle}
            onSelect={handleSelect}
            selectedNodeId={selectedNodeId}
            selectedNodeIds={selectedNodeIds}
            getChildren={getChildren}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
