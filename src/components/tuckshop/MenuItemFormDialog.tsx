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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTuckShopMenuMutations } from '@/hooks/useTuckShop';
import type { TuckshopItem } from '@/types';

const CATEGORIES = ['snack', 'drink', 'meal', 'stationery', 'other'] as const;
const ALLERGENS = ['nuts', 'dairy', 'gluten', 'eggs', 'soy', 'fish', 'shellfish'] as const;

interface FormValues {
  name: string;
  description: string;
  priceRands: string;
  category: string;
  image: string;
  stock: string;
  stockAlertThreshold: string;
  allergens: string[];
  allergenWarnings: string;
  isHalal: boolean;
  isKosher: boolean;
  isDailySpecial: boolean;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  sugar: string;
}

interface MenuItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: TuckshopItem | null;
  schoolId: string;
  onSaved: () => void;
}

export function MenuItemFormDialog({
  open, onOpenChange, editItem, schoolId, onSaved,
}: MenuItemFormDialogProps) {
  const { createMenuItem, updateMenuItem, extractErrorMessage } = useTuckShopMenuMutations();
  const [submitting, setSubmitting] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [category, setCategory] = useState('snack');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '', description: '', priceRands: '', category: 'snack',
      image: '', stock: '0', stockAlertThreshold: '10',
      allergens: [], allergenWarnings: '',
      isHalal: false, isKosher: false, isDailySpecial: false,
      calories: '', protein: '', carbs: '', fat: '', sugar: '',
    },
  });

  useEffect(() => {
    if (editItem) {
      const ei = editItem as TuckshopItem & Record<string, unknown>;
      reset({
        name: editItem.name,
        description: editItem.description ?? '',
        priceRands: (editItem.price / 100).toFixed(2),
        category: editItem.category,
        image: editItem.image ?? '',
        stock: String(editItem.stockCount ?? 0),
        stockAlertThreshold: String((ei.stockAlertThreshold as number) ?? 10),
        allergenWarnings: Array.isArray(ei.allergenWarnings)
          ? (ei.allergenWarnings as string[]).join(', ')
          : '',
        isHalal: (ei.isHalal as boolean) ?? false,
        isKosher: (ei.isKosher as boolean) ?? false,
        isDailySpecial: (ei.isDailySpecial as boolean) ?? false,
        calories: String((ei.nutritionalInfo as Record<string, number>)?.calories ?? ''),
        protein: String((ei.nutritionalInfo as Record<string, number>)?.protein ?? ''),
        carbs: String((ei.nutritionalInfo as Record<string, number>)?.carbs ?? ''),
        fat: String((ei.nutritionalInfo as Record<string, number>)?.fat ?? ''),
        sugar: String((ei.nutritionalInfo as Record<string, number>)?.sugar ?? ''),
      });
      setSelectedAllergens(editItem.allergens ?? []);
      setCategory(editItem.category);
    } else {
      reset({
        name: '', description: '', priceRands: '', category: 'snack',
        image: '', stock: '0', stockAlertThreshold: '10',
        allergens: [], allergenWarnings: '',
        isHalal: false, isKosher: false, isDailySpecial: false,
        calories: '', protein: '', carbs: '', fat: '', sugar: '',
      });
      setSelectedAllergens([]);
      setCategory('snack');
    }
  }, [editItem, reset]);

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen],
    );
  };

  const onSubmit = async (data: FormValues) => {
    const price = Math.round(parseFloat(data.priceRands) * 100);
    if (isNaN(price) || price <= 0) {
      toast.error('Price must be a positive number');
      return;
    }
    const stock = parseInt(data.stock, 10);
    if (isNaN(stock) || (stock < -1)) {
      toast.error('Stock must be -1 (unlimited) or a non-negative number');
      return;
    }

    const nutritionalInfo: Record<string, number> = {};
    for (const key of ['calories', 'protein', 'carbs', 'fat', 'sugar'] as const) {
      const val = data[key];
      if (val !== '' && val !== '0') {
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed >= 0) nutritionalInfo[key] = parsed;
      }
    }

    const body = {
      name: data.name.trim(),
      schoolId,
      description: data.description.trim() || undefined,
      price,
      category,
      image: data.image.trim() || undefined,
      stock,
      allergens: selectedAllergens,
      allergenWarnings: data.allergenWarnings
        ? data.allergenWarnings.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      isHalal: data.isHalal,
      isKosher: data.isKosher,
      isDailySpecial: data.isDailySpecial,
      stockAlertThreshold: parseInt(data.stockAlertThreshold, 10) || 10,
      nutritionalInfo: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
    };

    setSubmitting(true);
    try {
      if (editItem) {
        await updateMenuItem(editItem.id, body);
        toast.success('Menu item updated');
      } else {
        await createMenuItem(body);
        toast.success('Menu item created');
      }
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save menu item'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          <DialogDescription>
            {editItem ? 'Update the menu item details.' : 'Fill in the details to create a new menu item.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup label="Name" error={errors.name?.message}>
            <Input {...register('name', { required: 'Name is required' })} placeholder="Item name" />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(val: unknown) => setCategory(val as string)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
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
                placeholder="15.00"
                type="number"
                step="0.01"
                min="0.01"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Description">
            <Textarea {...register('description')} placeholder="Optional description" rows={2} />
          </FieldGroup>

          <FieldGroup label="Image URL">
            <Input {...register('image')} placeholder="https://..." />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Stock (-1 = unlimited)">
              <Input {...register('stock')} type="number" min="-1" />
            </FieldGroup>
            <FieldGroup label="Stock Alert Threshold">
              <Input {...register('stockAlertThreshold')} type="number" min="0" />
            </FieldGroup>
          </div>

          <div className="space-y-2">
            <Label>Allergens</Label>
            <div className="flex flex-wrap gap-3">
              {ALLERGENS.map((a) => (
                <label key={a} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={selectedAllergens.includes(a)}
                    onCheckedChange={() => toggleAllergen(a)}
                  />
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <FieldGroup label="Allergen Warnings (comma-separated)">
            <Input {...register('allergenWarnings')} placeholder="May contain traces of nuts" />
          </FieldGroup>

          <div className="flex flex-wrap gap-6">
            <SwitchField
              label="Halal"
              checked={false}
              registerName="isHalal"
              setValue={setValue}
              editValue={editItem ? ((editItem as TuckshopItem & Record<string, unknown>).isHalal as boolean) : false}
            />
            <SwitchField
              label="Kosher"
              checked={false}
              registerName="isKosher"
              setValue={setValue}
              editValue={editItem ? ((editItem as TuckshopItem & Record<string, unknown>).isKosher as boolean) : false}
            />
            <SwitchField
              label="Daily Special"
              checked={false}
              registerName="isDailySpecial"
              setValue={setValue}
              editValue={editItem ? ((editItem as TuckshopItem & Record<string, unknown>).isDailySpecial as boolean) : false}
            />
          </div>

          <div className="space-y-2">
            <Label>Nutritional Info (optional)</Label>
            <div className="grid grid-cols-5 gap-2">
              {(['calories', 'protein', 'carbs', 'fat', 'sugar'] as const).map((key) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{key}</Label>
                  <Input {...register(key)} type="number" min="0" step="0.1" placeholder="0" />
                </div>
              ))}
            </div>
          </div>

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

function FieldGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SwitchField({ label, registerName, setValue, editValue }: {
  label: string; checked: boolean; registerName: keyof FormValues;
  setValue: (name: keyof FormValues, value: boolean) => void; editValue: boolean;
}) {
  const [on, setOn] = useState(editValue);
  useEffect(() => { setOn(editValue); }, [editValue]);
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch
        checked={on}
        onCheckedChange={(val: boolean) => { setOn(val); setValue(registerName, val); }}
      />
      {label}
    </label>
  );
}
