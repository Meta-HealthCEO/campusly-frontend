'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { BudgetCategory } from '@/types';

export interface LineItemRow {
  categoryId: string;
  description: string;
  annualAmount: string;
  term1: string;
  term2: string;
  term3: string;
  term4: string;
  notes: string;
}

interface BudgetLineItemsTableProps {
  items: LineItemRow[];
  categories: BudgetCategory[];
  onChange: (items: LineItemRow[]) => void;
  readOnly?: boolean;
}

function emptyRow(): LineItemRow {
  return {
    categoryId: '', description: '', annualAmount: '',
    term1: '', term2: '', term3: '', term4: '', notes: '',
  };
}

export function BudgetLineItemsTable({
  items,
  categories,
  onChange,
  readOnly = false,
}: BudgetLineItemsTableProps) {
  const addRow = () => onChange([...items, emptyRow()]);

  const removeRow = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  const updateField = (index: number, field: keyof LineItemRow, value: string) => {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  };

  const totalCents = items.reduce((sum, item) => {
    const v = parseFloat(item.annualAmount);
    return sum + (isNaN(v) ? 0 : Math.round(v * 100));
  }, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2 min-w-[160px]">Category</th>
              <th className="py-2 px-2 min-w-[120px]">Description</th>
              <th className="py-2 px-2 min-w-[100px]">Annual (ZAR)</th>
              <th className="py-2 px-2 min-w-[80px]">T1</th>
              <th className="py-2 px-2 min-w-[80px]">T2</th>
              <th className="py-2 px-2 min-w-[80px]">T3</th>
              <th className="py-2 px-2 min-w-[80px]">T4</th>
              {!readOnly && <th className="py-2 pl-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-1 pr-2">
                  {readOnly ? (
                    <span>{categories.find((c) => c.id === item.categoryId)?.name ?? item.categoryId}</span>
                  ) : (
                    <Select
                      value={item.categoryId}
                      onValueChange={(v: unknown) => updateField(idx, 'categoryId', v as string)}
                    >
                      <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="py-1 px-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateField(idx, 'description', (e.target as HTMLInputElement).value)}
                    readOnly={readOnly}
                    placeholder="Line item description"
                    className="text-sm"
                  />
                </td>
                <td className="py-1 px-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={item.annualAmount}
                    onChange={(e) => updateField(idx, 'annualAmount', (e.target as HTMLInputElement).value)}
                    readOnly={readOnly}
                    className="text-sm"
                  />
                </td>
                {(['term1', 'term2', 'term3', 'term4'] as const).map((t) => (
                  <td key={t} className="py-1 px-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={item[t]}
                      onChange={(e) => updateField(idx, t, (e.target as HTMLInputElement).value)}
                      readOnly={readOnly}
                      className="text-sm"
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="py-1 pl-2">
                    <Button variant="ghost" size="sm" onClick={() => removeRow(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Add Line Item
          </Button>
        )}
        <p className="text-sm font-semibold ml-auto">
          Total: {formatCurrency(totalCents)}
        </p>
      </div>
    </div>
  );
}
