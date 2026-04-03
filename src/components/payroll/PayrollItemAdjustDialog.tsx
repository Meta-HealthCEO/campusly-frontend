'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { Adjustment, AdjustmentType, PayrollItem } from '@/types';

interface PayrollItemAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PayrollItem | null;
  onSubmit: (itemId: string, adjustments: Adjustment[]) => Promise<void>;
}

interface DraftAdjustment {
  name: string;
  amountRands: string;
  type: AdjustmentType;
}

const DEFAULT_DRAFT: DraftAdjustment = {
  name: '',
  amountRands: '',
  type: 'addition',
};

export function PayrollItemAdjustDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
}: PayrollItemAdjustDialogProps) {
  const [newAdjustments, setNewAdjustments] = useState<DraftAdjustment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNewAdjustments([]);
      setSubmitting(false);
    }
  }, [open]);

  const addRow = () => {
    setNewAdjustments((prev) => [...prev, { ...DEFAULT_DRAFT }]);
  };

  const removeRow = (index: number) => {
    setNewAdjustments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof DraftAdjustment, value: string) => {
    setNewAdjustments((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const handleSubmit = async () => {
    if (!item) return;

    const parsed: Adjustment[] = newAdjustments
      .filter((d) => d.name.trim() && d.amountRands.trim())
      .map((d) => ({
        name: d.name.trim(),
        amount: Math.round(parseFloat(d.amountRands) * 100),
        type: d.type,
      }));

    const allAdjustments: Adjustment[] = [...item.adjustments, ...parsed];

    setSubmitting(true);
    try {
      await onSubmit(item._id, allAdjustments);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to save adjustments', err);
    } finally {
      setSubmitting(false);
    }
  };

  const staffName = item
    ? `${item.staffId.firstName} ${item.staffId.lastName}`
    : '';

  const hasValidNew = newAdjustments.some(
    (d) => d.name.trim() && d.amountRands.trim() && parseFloat(d.amountRands) > 0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Payroll Item</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 px-1">
          {/* Staff info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Staff Member</Label>
              <p className="text-sm font-medium truncate">{staffName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Current Net Pay</Label>
              <p className="text-sm font-medium">
                {item ? formatCurrency(item.netPay) : '—'}
              </p>
            </div>
          </div>

          {/* Existing adjustments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Existing Adjustments</Label>
            {!item || item.adjustments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No adjustments yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border text-sm">
                {item.adjustments.map((adj, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-2 gap-2">
                    <span className="truncate flex-1">{adj.name}</span>
                    <span
                      className={
                        adj.type === 'addition'
                          ? 'text-green-700 font-medium whitespace-nowrap'
                          : 'text-destructive font-medium whitespace-nowrap'
                      }
                    >
                      {adj.type === 'addition' ? '+' : '-'}
                      {formatCurrency(adj.amount)}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize w-20 text-right shrink-0">
                      {adj.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add new adjustments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Add Adjustment</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>

            {newAdjustments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Click &ldquo;Add&rdquo; to add a bonus or deduction.
              </p>
            )}

            {newAdjustments.map((draft, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-2 items-start sm:items-end"
              >
                <div className="flex-1 space-y-1 w-full">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    placeholder="e.g. Performance bonus"
                    value={draft.name}
                    onChange={(e) => updateRow(index, 'name', e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-32 space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount (R)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={draft.amountRands}
                    onChange={(e) => updateRow(index, 'amountRands', e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-36 space-y-1">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select
                    value={draft.type}
                    onValueChange={(v: unknown) =>
                      updateRow(index, 'type', v as string)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="addition">Addition</SelectItem>
                      <SelectItem value="deduction">Deduction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 self-end"
                  onClick={() => removeRow(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (!hasValidNew && newAdjustments.length === 0)}
          >
            {submitting ? 'Saving…' : 'Save Adjustments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
