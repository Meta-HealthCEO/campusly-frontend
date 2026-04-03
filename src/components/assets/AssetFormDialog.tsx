'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type {
  Asset, AssetCategory, AssetLocation, AssetCondition, AssetStatus, CreateAssetPayload,
} from '@/types';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  categories: AssetCategory[];
  locations: AssetLocation[];
  onSubmit: (data: CreateAssetPayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<Asset>) => Promise<void>;
}

interface FormValues {
  categoryId: string;
  name: string;
  assetTag: string;
  serialNumber: string;
  make: string;
  model: string;
  description: string;
  purchaseDate: string;
  purchasePriceRands: string;
  warrantyExpiry: string;
  vendor: string;
  invoiceReference: string;
  locationId: string;
  status: AssetStatus;
  condition: AssetCondition | '';
  isPortable: boolean;
  notes: string;
}

const defaultValues: FormValues = {
  categoryId: '',
  name: '',
  assetTag: '',
  serialNumber: '',
  make: '',
  model: '',
  description: '',
  purchaseDate: '',
  purchasePriceRands: '',
  warrantyExpiry: '',
  vendor: '',
  invoiceReference: '',
  locationId: '',
  status: 'procured',
  condition: '',
  isPortable: false,
  notes: '',
};

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'procured', label: 'Procured' },
  { value: 'in_service', label: 'In Service' },
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'disposed', label: 'Disposed' },
  { value: 'lost', label: 'Lost' },
  { value: 'stolen', label: 'Stolen' },
];

const CONDITION_OPTIONS: { value: AssetCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

function resolveId(val: string | { id: string } | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.id;
}

export function AssetFormDialog({
  open, onOpenChange, asset, categories, locations, onSubmit, onUpdate,
}: AssetFormDialogProps) {
  const isEditing = !!asset;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues,
  });

  const statusValue = watch('status');
  const conditionValue = watch('condition');
  const categoryValue = watch('categoryId');
  const locationValue = watch('locationId');
  const isPortable = watch('isPortable');

  useEffect(() => {
    if (open) {
      if (asset) {
        reset({
          categoryId: resolveId(asset.categoryId as string | { id: string }),
          name: asset.name,
          assetTag: asset.assetTag,
          serialNumber: asset.serialNumber ?? '',
          make: asset.make ?? '',
          model: asset.model ?? '',
          description: asset.description ?? '',
          purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
          purchasePriceRands: asset.purchasePrice != null ? (asset.purchasePrice / 100).toFixed(2) : '',
          warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
          vendor: asset.vendor ?? '',
          invoiceReference: asset.invoiceReference ?? '',
          locationId: resolveId(asset.locationId as string | { id: string } | undefined),
          status: asset.status,
          condition: asset.condition ?? '',
          isPortable: asset.isPortable,
          notes: asset.notes ?? '',
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, asset, reset]);

  const onFormSubmit = async (values: FormValues) => {
    const payload: CreateAssetPayload = {
      categoryId: values.categoryId,
      name: values.name.trim(),
      assetTag: values.assetTag.trim(),
      serialNumber: values.serialNumber.trim() || undefined,
      make: values.make.trim() || undefined,
      model: values.model.trim() || undefined,
      description: values.description.trim() || undefined,
      purchaseDate: values.purchaseDate || undefined,
      purchasePrice: values.purchasePriceRands
        ? Math.round(parseFloat(values.purchasePriceRands) * 100)
        : undefined,
      warrantyExpiry: values.warrantyExpiry || undefined,
      vendor: values.vendor.trim() || undefined,
      invoiceReference: values.invoiceReference.trim() || undefined,
      locationId: values.locationId || undefined,
      status: values.status,
      condition: values.condition || undefined,
      isPortable: values.isPortable,
      notes: values.notes.trim() || undefined,
    };
    if (isEditing && asset && onUpdate) {
      await onUpdate(asset.id, payload);
    } else {
      await onSubmit(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the asset record.' : 'Register a new asset.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Category & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select value={categoryValue || undefined} onValueChange={(v: unknown) => setValue('categoryId', v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input id="name" placeholder="e.g. Dell Laptop" {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>

            {/* Asset Tag & Serial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assetTag">Asset Tag <span className="text-destructive">*</span></Label>
                <Input id="assetTag" placeholder="e.g. AST-0001" {...register('assetTag', { required: 'Asset tag is required' })} />
                {errors.assetTag && <p className="text-xs text-destructive">{errors.assetTag.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" placeholder="Manufacturer serial" {...register('serialNumber')} />
              </div>
            </div>

            {/* Make & Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" placeholder="e.g. Dell" {...register('make')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" placeholder="e.g. Latitude 5520" {...register('model')} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Brief description..." rows={2} {...register('description')} />
            </div>

            {/* Purchase Date & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input id="purchaseDate" type="date" {...register('purchaseDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePriceRands">Purchase Price (R)</Label>
                <Input id="purchasePriceRands" type="number" min="0" step="0.01" placeholder="0.00" {...register('purchasePriceRands')} />
              </div>
            </div>

            {/* Warranty & Vendor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                <Input id="warrantyExpiry" type="date" {...register('warrantyExpiry')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input id="vendor" placeholder="Supplier name" {...register('vendor')} />
              </div>
            </div>

            {/* Invoice Ref */}
            <div className="space-y-2">
              <Label htmlFor="invoiceReference">Invoice Reference</Label>
              <Input id="invoiceReference" placeholder="INV-2024-001" {...register('invoiceReference')} />
            </div>

            {/* Location, Status, Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={locationValue || 'none'} onValueChange={(v: unknown) => setValue('locationId', v === 'none' ? '' : v as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status <span className="text-destructive">*</span></Label>
                <Select value={statusValue} onValueChange={(v: unknown) => setValue('status', v as AssetStatus)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={conditionValue || 'none'} onValueChange={(v: unknown) => setValue('condition', v === 'none' ? '' : v as AssetCondition)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {CONDITION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Portable toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Portable</Label>
                <p className="text-xs text-muted-foreground">Can be checked out to individuals</p>
              </div>
              <Switch checked={isPortable} onCheckedChange={(v) => setValue('isPortable', v)} />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Any additional notes..." rows={2} {...register('notes')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Asset' : 'Add Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
