'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { BudgetLineItemsTable } from '@/components/budget';
import type { LineItemRow } from '@/components/budget/BudgetLineItemsTable';
import { formatCurrency } from '@/lib/utils';
import type { Budget, BudgetCategory, CreateBudgetPayload } from '@/types';

interface BudgetSetupSectionProps {
  budgets: Budget[];
  categories: BudgetCategory[];
  onCreate: (data: CreateBudgetPayload) => Promise<Budget>;
  onUpdate: (id: string, data: Partial<Budget>) => Promise<Budget>;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  revised: { label: 'Revised', variant: 'destructive' },
};

export function BudgetSetupSection({
  budgets,
  categories,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}: BudgetSetupSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setYear(new Date().getFullYear());
    setDescription('');
    setLineItems([]);
    setShowForm(false);
  }, []);

  const handleCreate = async () => {
    if (!name || lineItems.length === 0) return;
    setSubmitting(true);
    try {
      const payload: CreateBudgetPayload = {
        schoolId: '',
        year,
        name,
        description: description || undefined,
        lineItems: lineItems
          .filter((li) => li.categoryId && li.annualAmount)
          .map((li) => {
            const annual = Math.round(parseFloat(li.annualAmount) * 100);
            const terms = [li.term1, li.term2, li.term3, li.term4]
              .map((t) => (t ? Math.round(parseFloat(t) * 100) : 0));
            const hasTerms = terms.some((t) => t > 0);
            return {
              categoryId: li.categoryId,
              description: li.description || undefined,
              annualAmount: annual,
              ...(hasTerms ? { termAmounts: terms } : {}),
              notes: li.notes || undefined,
            };
          }),
      };
      await onCreate(payload);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    await onUpdate(id, { status: 'approved' } as Partial<Budget>);
    await onRefresh();
  };

  const handleDeleteBudget = async (id: string) => {
    await onDelete(id);
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Budget
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Annual Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="2026 Annual Budget" />
              </div>
              <div>
                <Label>Year <span className="text-destructive">*</span></Label>
                <Input type="number" value={year} onChange={(e) => setYear(Number((e.target as HTMLInputElement).value))} />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription((e.target as HTMLInputElement).value)} />
              </div>
            </div>

            <BudgetLineItemsTable items={lineItems} categories={categories} onChange={setLineItems} />

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleCreate} disabled={submitting || !name || lineItems.length === 0}>
                {submitting ? 'Creating...' : 'Create Budget'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 && !showForm ? (
        <EmptyState title="No budgets" description="Create your first annual budget." />
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const s = STATUS_MAP[b.status] ?? STATUS_MAP.draft;
            return (
              <Card key={b.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{b.name}</h4>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {b.year} &middot; {b.lineItems.length} items &middot; Total: {formatCurrency(b.totalBudgeted)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {b.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleApprove(b.id)}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteBudget(b.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
