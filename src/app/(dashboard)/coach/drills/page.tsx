'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  useDrillTemplates, createDrillTemplate, deleteDrillTemplate,
} from '@/hooks/useTraining';
import {
  TRAINING_FOCUS_LABELS,
  type TrainingFocus,
  type DrillTemplate,
} from '@/types/training';

const FOCUS_OPTIONS = Object.keys(TRAINING_FOCUS_LABELS) as TrainingFocus[];

export default function CoachDrillsPage() {
  const { drills, loading, refetch } = useDrillTemplates();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [focus, setFocus] = useState<TrainingFocus[]>([]);
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [equipment, setEquipment] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(''); setSport(''); setFocus([]);
    setDescription(''); setDuration(''); setEquipment('');
  }, [open]);

  function toggleFocus(f: TrainingFocus) {
    setFocus((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Drill name is required');
      return;
    }
    const dur = duration ? Number.parseInt(duration, 10) : undefined;
    setSubmitting(true);
    try {
      await createDrillTemplate({
        name: name.trim(),
        sport: sport.trim() || undefined,
        focus,
        description: description.trim() || undefined,
        durationMinutes: dur && Number.isFinite(dur) ? dur : undefined,
        equipment: equipment.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setOpen(false);
      await refetch();
    } catch { /* toasted */ } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(d: DrillTemplate) {
    if (!confirm(`Delete "${d.name}"?`)) return;
    try { await deleteDrillTemplate(d.id); await refetch(); } catch { /* toasted */ }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Drill Library" description="Reusable drills and exercises">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New drill
        </Button>
      </PageHeader>

      {loading && drills.length === 0 ? (
        <LoadingSpinner />
      ) : drills.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No drills in your library"
          description="Save reusable drills so you can attach them to training sessions."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drills.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold truncate">{d.name}</h3>
                    {d.sport && <p className="text-xs text-muted-foreground">{d.sport}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(d)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {d.focus.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {d.focus.map((f) => (
                      <Badge key={f} variant="outline" className="text-xs">
                        {TRAINING_FOCUS_LABELS[f]}
                      </Badge>
                    ))}
                  </div>
                )}
                {d.durationMinutes && (
                  <p className="text-xs text-muted-foreground">{d.durationMinutes} min</p>
                )}
                {d.description && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{d.description}</p>
                )}
                {d.equipment.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Equipment: {d.equipment.join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New drill</DialogTitle>
            <DialogDescription>Save a reusable drill for your training sessions.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 4v4 rondo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport">Sport (optional)</Label>
              <Input id="sport" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="e.g. Soccer" />
            </div>
            <div className="space-y-2">
              <Label>Focus areas</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FOCUS_OPTIONS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={focus.includes(f)} onCheckedChange={() => toggleFocus(f)} />
                    <span>{TRAINING_FOCUS_LABELS[f]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input id="duration" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment (comma-separated)</Label>
              <Input id="equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="e.g. cones, balls, bibs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save drill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
