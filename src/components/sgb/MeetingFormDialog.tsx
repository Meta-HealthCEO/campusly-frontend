'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import type { CreateMeetingPayload, SgbAgendaItem, SgbMeetingType } from '@/types';

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMeetingPayload) => Promise<void>;
}

interface FormValues {
  title: string;
  date: string;
  venue: string;
  type: SgbMeetingType;
}

export function MeetingFormDialog({ open, onOpenChange, onSubmit }: MeetingFormDialogProps) {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>();
  const [agenda, setAgenda] = useState<SgbAgendaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addAgendaItem = () => {
    setAgenda((prev) => [...prev, { title: '', presenter: '', duration: 10 }]);
  };

  const removeAgendaItem = (idx: number) => {
    setAgenda((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAgendaItem = (idx: number, field: keyof SgbAgendaItem, val: string | number) => {
    setAgenda((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));
  };

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const validAgenda = agenda.filter((a) => a.title.trim());
      await onSubmit({
        ...values,
        date: new Date(values.date).toISOString(),
        agenda: validAgenda.length > 0 ? validAgenda : undefined,
      });
      reset();
      setAgenda([]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule SGB Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input id="title" {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date & Time <span className="text-destructive">*</span></Label>
                <Input id="date" type="datetime-local" {...register('date', { required: 'Date is required' })} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div>
                <Label htmlFor="type">Type <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val: unknown) => setValue('type', val as SgbMeetingType)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinary">Ordinary</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                    <SelectItem value="annual_general">AGM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="venue">Venue <span className="text-destructive">*</span></Label>
              <Input id="venue" {...register('venue', { required: 'Venue is required' })} />
              {errors.venue && <p className="text-xs text-destructive">{errors.venue.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Agenda Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addAgendaItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              {agenda.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 mb-2">
                  <Input
                    className="flex-1"
                    placeholder="Item title"
                    value={item.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgendaItem(idx, 'title', e.target.value)}
                  />
                  <Input
                    className="w-24"
                    placeholder="Presenter"
                    value={item.presenter ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgendaItem(idx, 'presenter', e.target.value)}
                  />
                  <Input
                    className="w-16"
                    type="number"
                    placeholder="Min"
                    value={item.duration ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgendaItem(idx, 'duration', Number(e.target.value))}
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeAgendaItem(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
