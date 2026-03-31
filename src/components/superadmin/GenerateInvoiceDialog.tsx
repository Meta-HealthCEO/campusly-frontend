'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Tenant } from '@/types';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface GenerateInvoiceDialogProps {
  tenants: Tenant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    tenantId: string;
    lineItems: LineItem[];
    tax: number;
    dueDate: string;
    status: string;
  }) => Promise<void>;
}

const EMPTY_LINE: LineItem = { description: '', quantity: 1, unitPrice: 0 };

export function GenerateInvoiceDialog({
  tenants,
  open,
  onOpenChange,
  onSubmit,
}: GenerateInvoiceDialogProps) {
  const [tenantId, setTenantId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [tax, setTax] = useState(15);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [submitting, setSubmitting] = useState(false);

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addLineItem = () => setLineItems((prev) => [...prev, { ...EMPTY_LINE }]);

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const total = subtotal + subtotal * (tax / 100);

  const canSubmit =
    tenantId &&
    dueDate &&
    lineItems.every((li) => li.description.trim() && li.quantity > 0 && li.unitPrice >= 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({ tenantId, lineItems, tax, dueDate, status });
      setTenantId('');
      setLineItems([{ ...EMPTY_LINE }]);
      setTax(15);
      setDueDate('');
      setStatus('draft');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>Create a new platform invoice for a tenant.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tenant</Label>
            <Select value={tenantId} onValueChange={(v: unknown) => setTenantId((v as string) || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant..." />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Line Items</Label>
            {lineItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(i, 'quantity', parseInt(e.target.value) || 0)}
                  className="w-16"
                  min={1}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-24"
                  min={0}
                  step={0.01}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeLineItem(i)}
                  disabled={lineItems.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="mr-1 h-3 w-3" /> Add Line
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax (%)</Label>
              <Input
                type="number"
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: unknown) => setStatus((v as string) || 'draft')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>R{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({tax}%)</span>
              <span>R{(subtotal * tax / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Total</span>
              <span>R{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
