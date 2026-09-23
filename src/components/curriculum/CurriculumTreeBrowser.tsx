'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useCurriculumTree } from '@/hooks/useCurriculumTree';
import { filterChildrenToScope } from '@/lib/teaching-scope';
import { TreeNodeRow, sortSiblingsDesc } from './CurriculumTreeNodeRow';
import type { CurriculumNodeItem, TeachingScope } from '@/types';

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
  /**
   * The teacher's teaching scope. When it has grades, the tree starts at those
   * grades (skipping the phase level) and shows only the scoped subjects.
   */
  scope?: TeachingScope;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CurriculumTreeBrowser({
  frameworkId,
  onSelect,
  selectedNodeId,
  selectedNodeIds,
  scope,
}: CurriculumTreeBrowserProps) {
  const { getChildren, fetchChildren, fetchNode, isLoading, resolveAncestors, getNodeById } =
    useCurriculumTree(frameworkId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [scopedRoots, setScopedRoots] = useState<CurriculumNodeItem[] | null>(null);
  // False when none of the saved scope grades exist in this framework (stale
  // scope) — then show the whole tree rather than an empty one.
  const [scopeUsable, setScopeUsable] = useState(true);

  const scopeGradeKey = scope?.grades.join(',') ?? '';
  const isScoped = scopeGradeKey.length > 0 && scopeUsable;

  const handleSelect = useCallback(
    async (node: CurriculumNodeItem) => {
      // Emit immediately for snappy UI; ancestors arrive asynchronously.
      onSelect(node, { ancestors: [], getNodeById });
      const ancestors = await resolveAncestors(node);
      if (ancestors.length > 0) onSelect(node, { ancestors, getNodeById });
    },
    [onSelect, resolveAncestors, getNodeById],
  );

  // Load root nodes on mount / framework or scope change. A scoped tree's
  // roots are the teacher's grade nodes; otherwise the framework's phases.
  useEffect(() => {
    if (!frameworkId) return;
    setExpanded(new Set());
    setScopeUsable(true);
    if (scopeGradeKey.length === 0) {
      setScopedRoots(null);
      void fetchChildren(null);
      return;
    }
    let cancelled = false;
    setScopedRoots(null);
    void Promise.all(scopeGradeKey.split(',').map((id: string) => fetchNode(id))).then(
      (nodes: Array<CurriculumNodeItem | undefined>) => {
        if (cancelled) return;
        const roots = nodes.filter(
          (n): n is CurriculumNodeItem => n !== undefined && n.frameworkId === frameworkId,
        );
        if (roots.length === 0) {
          setScopeUsable(false);
          void fetchChildren(null);
          return;
        }
        setScopedRoots(roots);
      },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameworkId, scopeGradeKey]);

  const scopedGetChildren = useCallback(
    (parentId: string | null): CurriculumNodeItem[] | undefined => {
      const children = getChildren(parentId);
      if (!children || !scope || parentId === null) return children;
      return filterChildrenToScope(parentId, children, scope);
    },
    [getChildren, scope],
  );

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

  const rootNodes = isScoped ? scopedRoots ?? undefined : getChildren(null);
  const rootLoading = isScoped ? scopedRoots === null : isLoading(null);

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
      {scopeGradeKey.length > 0 && !scopeUsable ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Your saved grades aren&apos;t in this curriculum any more, so everything is shown.
          Update them in Settings.
        </p>
      ) : null}
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
            getChildren={scopedGetChildren}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
