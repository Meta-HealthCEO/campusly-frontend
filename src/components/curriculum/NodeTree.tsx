'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2, TreePine } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { NodeTreeItem } from './NodeTreeItem';
import type { CurriculumNodeItem } from '@/types';

interface NodeTreeProps {
  frameworkId: string;
  onEdit: (node: CurriculumNodeItem) => void;
  onDelete: (node: CurriculumNodeItem) => void;
  onAddChild: (parentNode: CurriculumNodeItem) => void;
  isAdmin: boolean;
  refreshKey?: number;
}

export function NodeTree({
  frameworkId,
  onEdit,
  onDelete,
  onAddChild,
  isAdmin,
  refreshKey,
}: NodeTreeProps) {
  const [nodesByParent, setNodesByParent] = useState<Map<string, CurriculumNodeItem[]>>(new Map());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchChildren = useCallback(async (parentId: string | null) => {
    const params: Record<string, string | number> = {
      frameworkId,
      limit: 200,
    };
    params.parentId = parentId === null ? 'null' : parentId;

    const response = await apiClient.get('/curriculum-structure/nodes', { params });
    const result = response.data?.data ?? response.data;
    const nodes: CurriculumNodeItem[] = Array.isArray(result)
      ? result
      : (result?.nodes ?? []);
    return nodes;
  }, [frameworkId]);

  useEffect(() => {
    if (!frameworkId) return;
    setLoading(true);
    setNodesByParent(new Map());
    setExpandedNodes(new Set());

    fetchChildren(null)
      .then((roots: CurriculumNodeItem[]) => {
        setNodesByParent(new Map([['root', roots]]));
      })
      .catch(() => {
        setNodesByParent(new Map());
      })
      .finally(() => setLoading(false));
  }, [frameworkId, fetchChildren, refreshKey]);

  const handleExpand = useCallback(async (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });

    if (!nodesByParent.has(nodeId)) {
      const children = await fetchChildren(nodeId);
      setNodesByParent((prev) => {
        const next = new Map(prev);
        next.set(nodeId, children);
        return next;
      });
    }
  }, [nodesByParent, fetchChildren]);

  const rootNodes = nodesByParent.get('root') ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rootNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <TreePine className="mb-2 h-10 w-10" />
        <p className="text-sm">No curriculum nodes yet</p>
        <p className="text-xs">Use bulk import or add nodes manually</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {rootNodes.map((node) => (
        <NodeTreeItem
          key={node.id}
          node={node}
          children={nodesByParent.get(node.id) ?? []}
          level={0}
          onExpand={handleExpand}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          expandedNodes={expandedNodes}
          childrenMap={nodesByParent}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
