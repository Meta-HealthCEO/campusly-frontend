'use client';

import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { displayNodeTitle } from '@/lib/curriculum-display';
import type { CurriculumNodeItem, CurriculumNodeType } from '@/types';

export interface TreeNodeRowProps {
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
export function sortSiblingsDesc(nodes: CurriculumNodeItem[]): CurriculumNodeItem[] {
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

/** One neutral chip for every node type: the chip's word names the type (ruling R21). Keys kept. */
/** One neutral chip for every node type: the chip's word names the type (ruling R21). Keys kept. */
const NODE_TYPE_COLORS: Record<CurriculumNodeType, string> = {
  phase:   'bg-muted text-muted-foreground',
  grade:   'bg-muted text-muted-foreground',
  subject: 'bg-muted text-muted-foreground',
  term:    'bg-muted text-muted-foreground',
  topic:   'bg-muted text-muted-foreground',
  subtopic:'bg-muted text-muted-foreground',
  outcome: 'bg-muted text-muted-foreground',
};

// ─── Tree Node Row ────────────────────────────────────────────────────────────

export function TreeNodeRow({
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
            ? 'bg-muted border-l-2 border-primary'
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
