'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { FolderTree, Plus, Sprout } from 'lucide-react';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';
import { CategoryTree, CategoryDialog } from '@/components/budget';
import type { BudgetCategory, CreateCategoryPayload } from '@/types';

export default function BudgetCategoriesPage() {
  const {
    categories, loading, fetchCategories,
    createCategory, updateCategory, deleteCategory, seedCategories,
  } = useBudgetCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleSubmit = useCallback(async (data: CreateCategoryPayload) => {
    const parentId = (data.parentId === 'none' || !data.parentId) ? null : data.parentId;
    await createCategory({ ...data, parentId });
    await fetchCategories();
  }, [createCategory, fetchCategories]);

  const handleUpdate = useCallback(async (id: string, data: Partial<BudgetCategory>) => {
    await updateCategory(id, data);
    await fetchCategories();
  }, [updateCategory, fetchCategories]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteCategory(id);
    await fetchCategories();
  }, [deleteCategory, fetchCategories]);

  const handleSeed = useCallback(async () => {
    await seedCategories();
    await fetchCategories();
  }, [seedCategories, fetchCategories]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Budget Categories" description="Manage expense categories and subcategories">
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="outline" onClick={handleSeed}>
              <Sprout className="h-4 w-4 mr-1" /> Seed Defaults
            </Button>
          )}
          <Button onClick={() => { setEditingCategory(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Category
          </Button>
        </div>
      </PageHeader>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories"
          description="Seed default South African school categories or create your own."
        />
      ) : (
        <CategoryTree
          categories={categories}
          onEdit={(cat) => { setEditingCategory(cat); setDialogOpen(true); }}
          onDelete={handleDelete}
        />
      )}

      <CategoryDialog
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
