'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';

interface AllowanceRow { name: string; amount: number; taxable: boolean; }
interface DeductionRow { name: string; amount: number; preTax: boolean; }

type EditorRow = AllowanceRow | DeductionRow;

interface AllowanceDeductionEditorProps {
  label: 'Allowances' | 'Deductions';
  items: EditorRow[];
  onChange: (items: EditorRow[]) => void;
}

export function AllowanceDeductionEditor({ label, items, onChange }: AllowanceDeductionEditorProps) {
  const isDeduction = label === 'Deductions';
  const toggleLabel = isDeduction ? 'Pre-tax' : 'Taxable';

  const addRow = () => {
    const newItem = isDeduction
      ? { name: '', amount: 0, preTax: true }
      : { name: '', amount: 0, taxable: true };
    onChange([...items, newItem]);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: string, value: unknown) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No {label.toLowerCase()} added.</p>
      )}

      {items.map((item, index) => {
        const toggleKey = isDeduction ? 'preTax' : 'taxable';
        const toggleValue = isDeduction
          ? (item as DeductionRow).preTax
          : (item as AllowanceRow).taxable;

        return (
          <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Input
              placeholder="Name"
              value={item.name}
              onChange={(e) => updateRow(index, 'name', e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount (R)"
              value={item.amount > 0 ? (item.amount / 100).toFixed(2) : ''}
              onChange={(e) => {
                const cents = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0;
                updateRow(index, 'amount', cents);
              }}
              className="w-full sm:w-32"
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={toggleValue}
                onCheckedChange={(checked: boolean) => updateRow(index, toggleKey, checked)}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{toggleLabel}</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(index)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
