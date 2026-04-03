'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { FolderTree, Plus, Sprout } from 'lucide-react';
import { useAssetCategories } from '@/hooks/useAssetCategories';
import { CategoryTree, CategoryFormDialog } from '@/components/assets';
import type { AssetCategory, CreateAssetCategoryPayload } from '@/types';

export default function AssetCategoriesPage() {
  const {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategories,
  } = useAssetCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);

  const handleSubmit = useCallback(async (data: CreateAssetCategoryPayload) => {
    const parentId = (data.parentId === 'none' || !data.parentId) ? undefined : data.parentId;
    await createCategory({ ...data, parentId });
    await fetchCategories();
    setDialogOpen(false);
  }, [createCategory, fetchCategories]);

  const handleUpdate = useCallback(async (id: string, data: Partial<AssetCategory>) => {
    await updateCategory(id, data);
    await fetchCategories();
    setDialogOpen(false);
    setEditingCategory(null);
  }, [updateCategory, fetchCategories]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteCategory(id);
    await fetchCategories();
  }, [deleteCategory, fetchCategories]);

  const handleSeed = useCallback(async () => {
    await seedCategories();
    await fetchCategories();
  }, [seedCategories, fetchCategories]);

  const handleEdit = useCallback((cat: AssetCategory) => {
    setEditingCategory(cat);
    setDialogOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingCategory(null);
    setDialogOpen(true);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Categories"
        description="Manage asset classification categories and subcategories"
      >
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="outline" onClick={handleSeed}>
              <Sprout className="h-4 w-4 mr-1" /> Seed Defaults
            </Button>
          )}
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-1" /> New Category
          </Button>
        </div>
      </PageHeader>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories"
          description="Seed default asset categories or create your own."
        />
      ) : (
        <CategoryTree
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        parentCategories={categories}
        onSubmit={handleSubmit}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
