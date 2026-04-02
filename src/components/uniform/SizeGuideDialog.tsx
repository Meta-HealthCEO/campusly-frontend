'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';
import { useSizeGuideMutations } from '@/hooks/useUniformMutations';
import type { UniformItem, SizeGuide, SizeGuideMeasurement } from './types';

interface SizeGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: UniformItem | null;
  schoolId: string;
}

interface FormValues {
  sizeChartImageUrl: string;
  notes: string;
}

export function SizeGuideDialog({ open, onOpenChange, item, schoolId }: SizeGuideDialogProps) {
  const {
    fetchSizeGuide, createSizeGuide, updateSizeGuide, deleteSizeGuide, extractErrorMessage,
  } = useSizeGuideMutations();
  const [sizeGuide, setSizeGuide] = useState<SizeGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [measurements, setMeasurements] = useState<SizeGuideMeasurement[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { sizeChartImageUrl: '', notes: '' },
  });

  const fetchGuide = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    const result = await fetchSizeGuide(item.id);
    if (result) {
      setSizeGuide(result.sizeGuide);
      reset({ sizeChartImageUrl: result.sizeGuide.sizeChartImageUrl, notes: result.sizeGuide.notes ?? '' });
      setMeasurements(result.sizeGuide.measurements ?? []);
      setIsEditing(false);
    } else {
      setSizeGuide(null);
      reset({ sizeChartImageUrl: '', notes: '' });
      setMeasurements([]);
      setIsEditing(true);
    }
    setLoading(false);
  }, [item, reset, fetchSizeGuide]);

  useEffect(() => {
    if (open && item) fetchGuide();
  }, [open, item, fetchGuide]);

  const addMeasurement = () => {
    setMeasurements((prev) => [...prev, { size: '', chest: '', waist: '', length: '' }]);
  };

  const removeMeasurement = (index: number) => {
    setMeasurements((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMeasurement = (index: number, field: keyof SizeGuideMeasurement, value: string) => {
    setMeasurements((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const onSubmit = async (data: FormValues) => {
    if (!item) return;
    if (!data.sizeChartImageUrl.trim()) {
      toast.error('Size chart image URL is required');
      return;
    }

    const body = {
      schoolId,
      sizeChartImageUrl: data.sizeChartImageUrl.trim(),
      measurements: measurements.filter((m) => m.size.trim()),
      notes: data.notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (sizeGuide) {
        await updateSizeGuide(item.id, body);
        toast.success('Size guide updated');
      } else {
        await createSizeGuide(item.id, body);
        toast.success('Size guide created');
      }
      await fetchGuide();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save size guide'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await deleteSizeGuide(item.id);
      toast.success('Size guide deleted');
      setSizeGuide(null);
      setMeasurements([]);
      reset({ sizeChartImageUrl: '', notes: '' });
      setIsEditing(true);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete size guide'));
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Size Guide - {item.name}</DialogTitle>
          <DialogDescription>
            {sizeGuide && !isEditing
              ? 'View or edit the size guide for this item.'
              : 'Create a size guide with measurements.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingSpinner size="sm" />
        ) : sizeGuide && !isEditing ? (
          <SizeGuideView
            sizeGuide={sizeGuide}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Size Chart Image URL *</Label>
              <Input {...register('sizeChartImageUrl')} placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Measurements</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMeasurement}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                </Button>
              </div>
              {measurements.length > 0 && (
                <MeasurementEditor
                  measurements={measurements}
                  onUpdate={updateMeasurement}
                  onRemove={removeMeasurement}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea {...register('notes')} placeholder="Fitting tips..." rows={2} />
            </div>

            <DialogFooter>
              {sizeGuide && (
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : sizeGuide ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SizeGuideView({ sizeGuide, onEdit, onDelete }: {
  sizeGuide: SizeGuide;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4">
      {sizeGuide.sizeChartImageUrl && (
        <div className="text-sm">
          <Label>Chart Image</Label>
          <a
            href={sizeGuide.sizeChartImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline block truncate"
          >
            {sizeGuide.sizeChartImageUrl}
          </a>
        </div>
      )}
      {sizeGuide.measurements.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead>Chest</TableHead>
                <TableHead>Waist</TableHead>
                <TableHead>Length</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizeGuide.measurements.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{m.size}</TableCell>
                  <TableCell>{m.chest}</TableCell>
                  <TableCell>{m.waist}</TableCell>
                  <TableCell>{m.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {sizeGuide.notes && (
        <p className="text-sm text-muted-foreground">{sizeGuide.notes}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={onEdit}>Edit</Button>
        <Button variant="destructive" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  );
}

function MeasurementEditor({ measurements, onUpdate, onRemove }: {
  measurements: SizeGuideMeasurement[];
  onUpdate: (index: number, field: keyof SizeGuideMeasurement, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Size</TableHead>
            <TableHead>Chest</TableHead>
            <TableHead>Waist</TableHead>
            <TableHead>Length</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {measurements.map((m, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input value={m.size} onChange={(e) => onUpdate(i, 'size', e.target.value)} placeholder="M" />
              </TableCell>
              <TableCell>
                <Input value={m.chest} onChange={(e) => onUpdate(i, 'chest', e.target.value)} placeholder="86-91cm" />
              </TableCell>
              <TableCell>
                <Input value={m.waist} onChange={(e) => onUpdate(i, 'waist', e.target.value)} placeholder="71-76cm" />
              </TableCell>
              <TableCell>
                <Input value={m.length} onChange={(e) => onUpdate(i, 'length', e.target.value)} placeholder="66cm" />
              </TableCell>
              <TableCell>
                <Button type="button" size="icon-xs" variant="ghost" onClick={() => onRemove(i)} aria-label="Remove size">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
