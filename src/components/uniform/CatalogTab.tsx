'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useUniformItemMutations } from '@/hooks/useUniformMutations';
import { getCatalogColumns } from './CatalogColumns';
import { UniformItemForm } from './UniformItemForm';
import { SizeGuideDialog } from './SizeGuideDialog';
import type { UniformItem } from './types';
import { useUniformItems } from '@/hooks/useUniform';

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'shirt', label: 'Shirt' },
  { value: 'pants', label: 'Pants' },
  { value: 'skirt', label: 'Skirt' },
  { value: 'blazer', label: 'Blazer' },
  { value: 'tie', label: 'Tie' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

export function CatalogTab() {
  const { items, loading, fetchItems, schoolId } = useUniformItems();
  const { deleteItem: deleteItemApi, toggleAvailability, extractErrorMessage } = useUniformItemMutations();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<UniformItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<UniformItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [sizeGuideItem, setSizeGuideItem] = useState<UniformItem | null>(null);

  useEffect(() => {
    fetchItems(categoryFilter);
  }, [fetchItems, categoryFilter]);

  const handleCreate = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const handleEdit = useCallback((item: UniformItem) => {
    setEditItem(item);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((item: UniformItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleSizeGuide = useCallback((item: UniformItem) => {
    setSizeGuideItem(item);
    setSizeGuideOpen(true);
  }, []);

  const handleToggleAvailability = useCallback(async (item: UniformItem) => {
    try {
      await toggleAvailability(item);
      toast.success(`Item ${item.isAvailable ? 'disabled' : 'enabled'}`);
      fetchItems(categoryFilter);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update availability'));
    }
  }, [fetchItems, categoryFilter, toggleAvailability, extractErrorMessage]);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await deleteItemApi(itemToDelete.id);
      toast.success('Item deleted');
      setDeleteDialogOpen(false);
      fetchItems(categoryFilter);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete item'));
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => getCatalogColumns({
      onEdit: handleEdit,
      onDelete: handleDelete,
      onSizeGuide: handleSizeGuide,
      onToggleAvailability: handleToggleAvailability,
    }),
    [handleEdit, handleDelete, handleSizeGuide, handleToggleAvailability],
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={categoryFilter} onValueChange={(val: unknown) => setCategoryFilter(val as string)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder="Search uniform items..." />

      <UniformItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        schoolId={schoolId}
        onSaved={() => fetchItems(categoryFilter)}
      />

      <SizeGuideDialog
        open={sizeGuideOpen}
        onOpenChange={setSizeGuideOpen}
        item={sizeGuideItem}
        schoolId={schoolId}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
