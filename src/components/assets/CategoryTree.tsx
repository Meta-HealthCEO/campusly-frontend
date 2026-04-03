'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetCategory } from '@/types';

interface CategoryTreeProps {
  categories: AssetCategory[];
  onEdit: (cat: AssetCategory) => void;
  onDelete: (id: string) => void;
}

function CategoryRow({
  category,
  isChild,
  onEdit,
  onDelete,
}: {
  category: AssetCategory;
  isChild: boolean;
  onEdit: (cat: AssetCategory) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border p-3',
        isChild && 'ml-6 border-dashed',
        !category.isActive && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isChild && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <Badge variant="outline" className="shrink-0 font-mono text-xs">
          {category.code}
        </Badge>
        <span className="text-sm font-medium truncate">{category.name}</span>
        {category.depreciationRate != null && (
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
            {category.depreciationRate}%/yr
          </span>
        )}
        {category.usefulLifeYears != null && (
          <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
            {category.usefulLifeYears}yr life
          </span>
        )}
        {!category.isActive && (
          <Badge variant="destructive" className="shrink-0 text-xs">Inactive</Badge>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(category.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function CategoryTree({ categories, onEdit, onDelete }: CategoryTreeProps) {
  return (
    <div className="space-y-2">
      {categories.map((parent) => (
        <div key={parent.id} className="space-y-1">
          <CategoryRow
            category={parent}
            isChild={false}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          {parent.children?.map((child) => (
            <CategoryRow
              key={child.id}
              category={child}
              isChild
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
