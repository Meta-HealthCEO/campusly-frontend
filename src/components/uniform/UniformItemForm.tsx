'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import type { UniformItem, UniformCategory } from './types';

const CATEGORIES: UniformCategory[] = [
  'shirt', 'pants', 'skirt', 'blazer', 'tie', 'shoes', 'sports', 'other',
];

interface FormValues {
  name: string;
  description: string;
  priceRands: string;
  sizes: string;
  stock: string;
  lowStockThreshold: string;
  image: string;
  sizeGuideUrl: string;
}

interface UniformItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: UniformItem | null;
  schoolId: string;
  onSaved: () => void;
}

export function UniformItemForm({
  open, onOpenChange, editItem, schoolId, onSaved,
}: UniformItemFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<UniformCategory>('shirt');
  const [isAvailable, setIsAvailable] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '', description: '', priceRands: '', sizes: '',
      stock: '0', lowStockThreshold: '5', image: '', sizeGuideUrl: '',
    },
  });

  useEffect(() => {
    if (editItem) {
      reset({
        name: editItem.name,
        description: editItem.description ?? '',
        priceRands: (editItem.price / 100).toFixed(2),
        sizes: editItem.sizes.join(', '),
        stock: String(editItem.stock),
        lowStockThreshold: String(editItem.lowStockThreshold),
        image: editItem.image ?? '',
        sizeGuideUrl: editItem.sizeGuideUrl ?? '',
      });
      setCategory(editItem.category);
      setIsAvailable(editItem.isAvailable);
    } else {
      reset({
        name: '', description: '', priceRands: '', sizes: '',
        stock: '0', lowStockThreshold: '5', image: '', sizeGuideUrl: '',
      });
      setCategory('shirt');
      setIsAvailable(true);
    }
  }, [editItem, reset]);

  const onSubmit = async (data: FormValues) => {
    const price = Math.round(parseFloat(data.priceRands) * 100);
    if (isNaN(price) || price <= 0) {
      toast.error('Price must be a positive number');
      return;
    }

    const body = {
      name: data.name.trim(),
      schoolId,
      description: data.description.trim() || undefined,
      category,
      sizes: data.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      price,
      stock: parseInt(data.stock, 10) || 0,
      isAvailable,
      lowStockThreshold: parseInt(data.lowStockThreshold, 10) || 5,
      image: data.image.trim() || undefined,
      sizeGuideUrl: data.sizeGuideUrl.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (editItem) {
        await apiClient.put(`/uniform/items/${editItem.id}`, body);
        toast.success('Uniform item updated');
      } else {
        await apiClient.post('/uniform/items', body);
        toast.success('Uniform item created');
      }
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to save uniform item';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Uniform Item' : 'Add Uniform Item'}</DialogTitle>
          <DialogDescription>
            {editItem ? 'Update the uniform item details.' : 'Create a new uniform catalog item.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup label="Name" error={errors.name?.message}>
            <Input {...register('name', { required: 'Name is required' })} placeholder="White School Shirt" />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(val: unknown) => setCategory(val as UniformCategory)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FieldGroup label="Price (Rands)" error={errors.priceRands?.message}>
              <Input
                {...register('priceRands', {
                  required: 'Price is required',
                  validate: (v) => {
                    const n = parseFloat(v);
                    return (!isNaN(n) && n > 0) || 'Must be positive';
                  },
                })}
                placeholder="180.00"
                type="number"
                step="0.01"
                min="0.01"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Sizes (comma-separated)">
            <Input {...register('sizes')} placeholder="XS, S, M, L, XL" />
          </FieldGroup>

          <FieldGroup label="Description">
            <Textarea {...register('description')} placeholder="Optional description" rows={2} />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Stock">
              <Input {...register('stock')} type="number" min="0" />
            </FieldGroup>
            <FieldGroup label="Low Stock Threshold">
              <Input {...register('lowStockThreshold')} type="number" min="0" />
            </FieldGroup>
          </div>

          <FieldGroup label="Image URL">
            <Input {...register('image')} placeholder="https://..." />
          </FieldGroup>

          <FieldGroup label="Size Guide URL">
            <Input {...register('sizeGuideUrl')} placeholder="https://..." />
          </FieldGroup>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
            Available for purchase
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
