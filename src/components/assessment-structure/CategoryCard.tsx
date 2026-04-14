'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineItemRow } from './LineItemRow';
import { AddLineItemForm } from './AddLineItemForm';
import { WeightIndicator } from './WeightIndicator';
import type {
  Category,
  StructureStatus,
  UpdateCategoryPayload,
  AddLineItemPayload,
  UpdateLineItemPayload,
  LineItemStatus,
} from '@/types';

interface Props {
  category: Category;
  structureStatus: StructureStatus;
  onUpdateCategory: (catId: string, payload: UpdateCategoryPayload) => Promise<void>;
  onDeleteCategory: (catId: string) => Promise<void>;
  onAddLineItem: (catId: string, payload: AddLineItemPayload) => Promise<void>;
  onUpdateLineItem: (catId: string, itemId: string, payload: UpdateLineItemPayload) => Promise<void>;
  onDeleteLineItem: (catId: string, itemId: string) => Promise<void>;
}

const TYPE_LABELS: Record<string, string> = {
  test: 'Test',
  exam: 'Exam',
  assignment: 'Assignment',
  practical: 'Practical',
  project: 'Project',
  other: 'Other',
};

export function CategoryCard({
  category,
  structureStatus,
  onUpdateCategory,
  onDeleteCategory,
  onAddLineItem,
  onUpdateLineItem,
  onDeleteLineItem,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const isLocked = structureStatus === 'locked';

  const hasCustomWeights = category.lineItems.some((i) => i.weight != null);
  const customWeightTotal = hasCustomWeights
    ? category.lineItems.reduce((sum, i) => sum + (i.weight ?? 0), 0)
    : 0;

  const handleAddLineItem = async (payload: AddLineItemPayload) => {
    await onAddLineItem(category.id, payload);
  };

  const handleUpdateStatus = async (itemId: string, status: LineItemStatus) => {
    await onUpdateLineItem(category.id, itemId, { status });
  };

  const handleDeleteLineItem = async (itemId: string) => {
    await onDeleteLineItem(category.id, itemId);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-0 py-0">
        {/* Header */}
        <div className="flex items-center gap-2 py-3">
          <button
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? <ChevronDown className="size-4 shrink-0" />
              : <ChevronRight className="size-4 shrink-0" />}
          </button>

          <button
            className="flex-1 flex items-center gap-2 min-w-0 text-left"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="font-medium truncate">{category.name}</span>
            <Badge variant="outline" className="shrink-0">{TYPE_LABELS[category.type] ?? category.type}</Badge>
            <Badge variant="secondary" className="shrink-0">{category.weight}%</Badge>
          </button>

          {!isLocked && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
              onClick={() => onDeleteCategory(category.id)}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">Delete category</span>
            </Button>
          )}
        </div>

        {/* Line items */}
        {expanded && (
          <div className="flex flex-col gap-1 border-t py-2">
            {category.lineItems.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-1">No assessments yet</p>
            ) : (
              category.lineItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  structureStatus={structureStatus}
                  onUpdateStatus={(status) => void handleUpdateStatus(item.id, status)}
                  onDelete={() => void handleDeleteLineItem(item.id)}
                />
              ))
            )}

            {hasCustomWeights && (
              <div className="px-3 pt-1">
                <WeightIndicator
                  total={customWeightTotal}
                  label="Item weights"
                />
              </div>
            )}

            {!isLocked && (
              <div className="px-3 pt-1">
                <AddLineItemForm
                  onAdd={handleAddLineItem}
                  disabled={isLocked}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
