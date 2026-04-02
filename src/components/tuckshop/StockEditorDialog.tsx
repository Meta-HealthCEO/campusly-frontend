'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTuckShopMenuMutations } from '@/hooks/useTuckShop';
import type { TuckshopItem } from '@/types';

interface StockEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TuckshopItem | null;
  onSaved: () => void;
}

export function StockEditorDialog({ open, onOpenChange, item, onSaved }: StockEditorDialogProps) {
  const { updateStock, extractErrorMessage } = useTuckShopMenuMutations();
  const [stock, setStock] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && item) {
      setStock(String(item.stockCount ?? 0));
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!item) return;
    const value = parseInt(stock, 10);
    if (isNaN(value) || (value < -1)) {
      toast.error('Stock must be -1 (unlimited) or a non-negative integer');
      return;
    }

    setSubmitting(true);
    try {
      await updateStock(item.id, value);
      toast.success('Stock updated');
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update stock'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>
            Set the stock for <strong>{item?.name}</strong>. Use -1 for unlimited.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Stock Quantity</Label>
          <Input
            type="number"
            min="-1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Current: {item?.stockCount === -1 ? 'Unlimited' : item?.stockCount ?? 0}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Update Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
