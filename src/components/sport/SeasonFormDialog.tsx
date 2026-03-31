'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api-client';
import type { Season } from '@/types/sport';

interface SeasonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  season: Season | null;
  onSuccess: () => void;
}

export function SeasonFormDialog({ open, onOpenChange, schoolId, season, onSuccess }: SeasonFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (season) {
      setName(season.name);
      setSport(season.sport);
      setStartDate(season.startDate ? season.startDate.slice(0, 10) : '');
      setEndDate(season.endDate ? season.endDate.slice(0, 10) : '');
      setIsActive(season.isActive);
    } else {
      setName(''); setSport(''); setStartDate(''); setEndDate(''); setIsActive(true);
    }
  }, [season, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sport.trim() || !startDate || !endDate) {
      toast.error('Name, sport, start date, and end date are required');
      return;
    }
    setSubmitting(true);
    try {
      if (season) {
        await apiClient.put(`/sport/seasons/${season.id}`, {
          name: name.trim(),
          sport: sport.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          isActive,
        });
        toast.success('Season updated successfully');
      } else {
        await apiClient.post('/sport/seasons', {
          name: name.trim(),
          schoolId,
          sport: sport.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          isActive,
        });
        toast.success('Season created successfully');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to save season';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{season ? 'Edit Season' : 'New Season'}</DialogTitle>
          <DialogDescription>
            {season ? 'Update season details.' : 'Create a new competition season.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="season-name">Name *</Label>
            <Input id="season-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026 Winter League" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="season-sport">Sport *</Label>
            <Input id="season-sport" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="e.g. Soccer" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season-start">Start Date *</Label>
              <Input id="season-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season-end">End Date *</Label>
              <Input id="season-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={(val: boolean) => setIsActive(val)} />
            <Label>Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : season ? 'Update Season' : 'Create Season'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
