'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Upload, TreePine } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { NodeTree } from '@/components/curriculum/NodeTree';
import { NodeFormDialog } from '@/components/curriculum/NodeFormDialog';
import { BulkImportDialog } from '@/components/curriculum/BulkImportDialog';
import { extractErrorMessage } from '@/lib/api-helpers';
import type {
  CurriculumNodeItem,
  CreateNodePayload,
  UpdateNodePayload,
  BulkImportPayload,
} from '@/types';

export default function CurriculumStructurePage() {
  const {
    frameworks,
    loading,
    selectedFramework,
    setSelectedFramework,
    createNode,
    updateNode,
    deleteNode,
    bulkImport,
    fetchChildNodes,
  } = useCurriculumStructure();

  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<CurriculumNodeItem | null>(null);
  const [parentNode, setParentNode] = useState<CurriculumNodeItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const fetchChildren = useCallback(
    async (parentId: string | null) => {
      return fetchChildNodes(parentId, selectedFramework);
    },
    [fetchChildNodes, selectedFramework],
  );

  const handleAddRoot = useCallback(() => {
    setEditingNode(null);
    setParentNode(null);
    setNodeDialogOpen(true);
  }, []);

  const handleAddChild = useCallback((parent: CurriculumNodeItem) => {
    setEditingNode(null);
    setParentNode(parent);
    setNodeDialogOpen(true);
  }, []);

  const handleEdit = useCallback((node: CurriculumNodeItem) => {
    setEditingNode(node);
    setParentNode(null);
    setNodeDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (node: CurriculumNodeItem) => {
      if (!confirm(`Delete "${node.title}"? This will also remove all child nodes.`)) return;
      try {
        await deleteNode(node.id);
        refresh();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to delete node'));
      }
    },
    [deleteNode, refresh],
  );

  const handleCreate = useCallback(
    async (data: CreateNodePayload) => {
      try {
        await createNode(data);
        refresh();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to create node'));
      }
    },
    [createNode, refresh],
  );

  const handleUpdate = useCallback(
    async (id: string, data: UpdateNodePayload) => {
      try {
        await updateNode(id, data);
        refresh();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to update node'));
      }
    },
    [updateNode, refresh],
  );

  const handleBulkImport = useCallback(
    async (data: BulkImportPayload) => {
      try {
        await bulkImport(data);
        refresh();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Bulk import failed'));
      }
    },
    [bulkImport, refresh],
  );

  if (loading && frameworks.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum Structure"
        description="Manage your curriculum framework tree"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={selectedFramework || 'none'}
          onValueChange={(v: unknown) => setSelectedFramework(v as string)}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select framework" />
          </SelectTrigger>
          <SelectContent>
            {frameworks.length === 0 ? (
              <SelectItem value="none" disabled>
                No frameworks
              </SelectItem>
            ) : (
              frameworks.map((fw) => (
                <SelectItem key={fw.id} value={fw.id}>
                  {fw.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} disabled={!selectedFramework}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={handleAddRoot} disabled={!selectedFramework}>
            <Plus className="mr-2 h-4 w-4" />
            Add Root Node
          </Button>
        </div>
      </div>

      {!selectedFramework ? (
        <EmptyState
          icon={TreePine}
          title="No framework selected"
          description="Select a curriculum framework above to manage its structure."
        />
      ) : (
        <NodeTree
          frameworkId={selectedFramework}
          fetchChildren={fetchChildren}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddChild={handleAddChild}
          isAdmin={true}
          refreshKey={refreshKey}
        />
      )}

      <NodeFormDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        onSubmitCreate={handleCreate}
        onSubmitUpdate={handleUpdate}
        editingNode={editingNode}
        parentNode={parentNode}
        frameworkId={selectedFramework}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSubmit={handleBulkImport}
        frameworkId={selectedFramework}
      />
    </div>
  );
}
