'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onUpdateCategory: (catId: string, payload: UpdateCategoryPayload) => Promise<unknown>;
  onDeleteCategory: (catId: string) => Promise<unknown>;
  onAddLineItem: (catId: string, payload: AddLineItemPayload) => Promise<unknown>;
  onUpdateLineItem: (catId: string, itemId: string, payload: UpdateLineItemPayload) => Promise<unknown>;
  onDeleteLineItem: (catId: string, itemId: string) => Promise<unknown>;
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
  const [editingWeight, setEditingWeight] = useState(false);
  const [newWeight, setNewWeight] = useState(String(category.weight));
  const [savingWeight, setSavingWeight] = useState(false);

  const isLocked = structureStatus === 'locked';
  const isActive = structureStatus === 'active';

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

  const handleWeightSave = async () => {
    const parsed = Number(newWeight);
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) return;
    if (parsed === category.weight) {
      setEditingWeight(false);
      return;
    }

    // Warn if structure is active and any line item has marks (status !== 'pending')
    const hasMarks = category.lineItems.some((li) => li.status !== 'pending');
    if (isActive && hasMarks) {
      const confirmed = window.confirm(
        'Changing this weight will recalculate all projected term marks. Students have marks captured in this category. Continue?',
      );
      if (!confirmed) {
        setNewWeight(String(category.weight));
        setEditingWeight(false);
        return;
      }
    }

    setSavingWeight(true);
    try {
      await onUpdateCategory(category.id, { weight: parsed });
      setEditingWeight(false);
    } finally {
      setSavingWeight(false);
    }
  };

  const handleWeightCancel = () => {
    setNewWeight(String(category.weight));
    setEditingWeight(false);
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
          </button>

          {/* Weight badge — clickable when not locked */}
          {editingWeight ? (
            <div className="flex items-center gap-1 shrink-0">
              <Input
                className="h-6 w-16 px-1 text-xs"
                type="number"
                min={1}
                max={100}
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleWeightSave();
                  if (e.key === 'Escape') handleWeightCancel();
                }}
                autoFocus
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => void handleWeightSave()}
                disabled={savingWeight}
              >
                <Check className="size-3" />
                <span className="sr-only">Confirm weight</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleWeightCancel}
                disabled={savingWeight}
              >
                <X className="size-3" />
                <span className="sr-only">Cancel weight edit</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="secondary">{category.weight}%</Badge>
              {!isLocked && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingWeight(true)}
                >
                  <Pencil className="size-3" />
                  <span className="sr-only">Edit weight</span>
                </Button>
              )}
            </div>
          )}

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
