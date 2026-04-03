'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type {
  AssetInsurance,
  AssetCategory,
  CreateInsurancePayload,
  PremiumFrequency,
} from '@/types';

interface InsuranceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: AssetInsurance | null;
  categories: AssetCategory[];
  onSubmit: (data: CreateInsurancePayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<AssetInsurance>) => Promise<void>;
}

const frequencies: { value: PremiumFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

interface FormState {
  policyNumber: string;
  insurer: string;
  categoryId: string;
  coverageRands: string;
  premiumRands: string;
  premiumFrequency: PremiumFrequency | '';
  startDate: string;
  expiryDate: string;
  excessRands: string;
  notes: string;
}

const defaultForm: FormState = {
  policyNumber: '',
  insurer: '',
  categoryId: '',
  coverageRands: '',
  premiumRands: '',
  premiumFrequency: '',
  startDate: '',
  expiryDate: '',
  excessRands: '',
  notes: '',
};

function resolveId(field: AssetInsurance['categoryId']): string {
  if (typeof field === 'object' && field != null) return field.id;
  return field ?? '';
}

export function InsuranceFormDialog({
  open,
  onOpenChange,
  policy,
  categories,
  onSubmit,
  onUpdate,
}: InsuranceFormDialogProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (policy) {
        setForm({
          policyNumber: policy.policyNumber,
          insurer: policy.insurer,
          categoryId: resolveId(policy.categoryId),
          coverageRands: String(policy.coverageAmount / 100),
          premiumRands: String(policy.premium / 100),
          premiumFrequency: policy.premiumFrequency,
          startDate: policy.startDate?.slice(0, 10) ?? '',
          expiryDate: policy.expiryDate?.slice(0, 10) ?? '',
          excessRands: policy.excess != null ? String(policy.excess / 100) : '',
          notes: policy.notes ?? '',
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [open, policy]);

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const coverageCents = form.coverageRands ? Math.round(parseFloat(form.coverageRands) * 100) : 0;
  const premiumCents = form.premiumRands ? Math.round(parseFloat(form.premiumRands) * 100) : 0;
  const excessCents = form.excessRands ? Math.round(parseFloat(form.excessRands) * 100) : undefined;

  const handleSubmit = async () => {
    if (!form.policyNumber.trim()) { toast.error('Policy number is required'); return; }
    if (!form.insurer.trim()) { toast.error('Insurer is required'); return; }
    if (!form.premiumFrequency) { toast.error('Select a premium frequency'); return; }
    if (!form.startDate) { toast.error('Start date is required'); return; }
    if (!form.expiryDate) { toast.error('Expiry date is required'); return; }
    if (coverageCents <= 0) { toast.error('Coverage amount must be greater than 0'); return; }
    if (premiumCents <= 0) { toast.error('Premium must be greater than 0'); return; }

    const payload: CreateInsurancePayload = {
      policyNumber: form.policyNumber.trim(),
      insurer: form.insurer.trim(),
      categoryId: form.categoryId || undefined,
      coverageAmount: coverageCents,
      premium: premiumCents,
      premiumFrequency: form.premiumFrequency,
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      excess: excessCents,
      notes: form.notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (policy && onUpdate) {
        await onUpdate(policy.id, payload);
        toast.success('Insurance policy updated');
      } else {
        await onSubmit(payload);
        toast.success('Insurance policy created');
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = Boolean(policy);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Insurance Policy' : 'Add Insurance Policy'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the insurance policy details.' : 'Create a new insurance policy for an asset category.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ins-policy">Policy Number <span className="text-destructive">*</span></Label>
              <Input
                id="ins-policy"
                value={form.policyNumber}
                onChange={(e) => set('policyNumber')(e.target.value)}
                placeholder="e.g. POL-2026-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ins-insurer">Insurer <span className="text-destructive">*</span></Label>
              <Input
                id="ins-insurer"
                value={form.insurer}
                onChange={(e) => set('insurer')(e.target.value)}
                placeholder="e.g. Outsurance"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.categoryId || 'none'}
              onValueChange={(v: unknown) => set('categoryId')(v === 'none' ? '' : (v as string))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ins-coverage">Coverage Amount (Rands) <span className="text-destructive">*</span></Label>
              <Input
                id="ins-coverage"
                type="number"
                min="0"
                step="0.01"
                value={form.coverageRands}
                onChange={(e) => set('coverageRands')(e.target.value)}
                placeholder="0.00"
              />
              {form.coverageRands && (
                <p className="text-xs text-muted-foreground">= {formatCurrency(coverageCents)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ins-excess">Excess (Rands)</Label>
              <Input
                id="ins-excess"
                type="number"
                min="0"
                step="0.01"
                value={form.excessRands}
                onChange={(e) => set('excessRands')(e.target.value)}
                placeholder="0.00"
              />
              {form.excessRands && (
                <p className="text-xs text-muted-foreground">= {excessCents != null ? formatCurrency(excessCents) : '—'}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ins-premium">Premium (Rands) <span className="text-destructive">*</span></Label>
              <Input
                id="ins-premium"
                type="number"
                min="0"
                step="0.01"
                value={form.premiumRands}
                onChange={(e) => set('premiumRands')(e.target.value)}
                placeholder="0.00"
              />
              {form.premiumRands && (
                <p className="text-xs text-muted-foreground">= {formatCurrency(premiumCents)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Frequency <span className="text-destructive">*</span></Label>
              <Select
                value={form.premiumFrequency}
                onValueChange={(v: unknown) => set('premiumFrequency')(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ins-start">Start Date <span className="text-destructive">*</span></Label>
              <Input
                id="ins-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate')(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ins-expiry">Expiry Date <span className="text-destructive">*</span></Label>
              <Input
                id="ins-expiry"
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate')(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ins-notes">Notes</Label>
            <Textarea
              id="ins-notes"
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="Additional policy notes"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
