'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { EVENT_TYPE_LABELS } from './types';
import type { EventRecord, EventType, CreateEventInput, UpdateEventInput } from './types';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventRecord | null;
  onCreate?: (data: Omit<CreateEventInput, 'schoolId'>) => Promise<EventRecord>;
  onUpdate?: (id: string, data: UpdateEventInput) => Promise<EventRecord>;
  onSuccess?: () => void;
}

const defaultFormState = {
  title: '',
  description: '',
  eventType: 'other' as EventType,
  date: '',
  startTime: '08:00',
  endTime: '15:00',
  venue: '',
  capacity: '',
  rsvpRequired: false,
  rsvpDeadline: '',
  isTicketed: false,
  ticketPrice: '',
  galleryEnabled: false,
};

export function EventFormDialog({
  open, onOpenChange, event, onCreate, onUpdate, onSuccess,
}: EventFormDialogProps) {
  const [form, setForm] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!event;

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description ?? '',
        eventType: event.eventType,
        date: event.date ? event.date.split('T')[0] : '',
        startTime: event.startTime,
        endTime: event.endTime,
        venue: event.venue ?? '',
        capacity: event.capacity?.toString() ?? '',
        rsvpRequired: event.rsvpRequired,
        rsvpDeadline: event.rsvpDeadline ? event.rsvpDeadline.split('T')[0] : '',
        isTicketed: event.isTicketed,
        ticketPrice: event.ticketPrice != null ? (event.ticketPrice / 100).toString() : '',
        galleryEnabled: event.galleryEnabled,
      });
    } else {
      setForm(defaultFormState);
    }
  }, [event, open]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Omit<CreateEventInput, 'schoolId'> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        eventType: form.eventType,
        date: new Date(form.date).toISOString(),
        startTime: form.startTime,
        endTime: form.endTime,
        venue: form.venue.trim() || undefined,
        capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
        rsvpRequired: form.rsvpRequired,
        rsvpDeadline: form.rsvpDeadline ? new Date(form.rsvpDeadline).toISOString() : undefined,
        isTicketed: form.isTicketed,
        ticketPrice: form.ticketPrice ? Math.round(parseFloat(form.ticketPrice) * 100) : undefined,
        galleryEnabled: form.galleryEnabled,
      };

      if (isEditing && event && onUpdate) {
        await onUpdate(event.id, payload);
        toast.success('Event updated successfully');
      } else if (onCreate) {
        await onCreate(payload);
        toast.success('Event created successfully');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const fallback = isEditing ? 'Failed to update event' : 'Failed to create event';
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? fallback;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = <K extends keyof typeof defaultFormState>(key: K, val: (typeof defaultFormState)[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event' : 'Create Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Event title" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Event description" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Event Type *</Label>
            <Select value={form.eventType} onValueChange={(val: unknown) => setField('eventType', val as EventType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input value={form.venue} onChange={(e) => setField('venue', e.target.value)} placeholder="Location" />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input type="number" min="1" value={form.capacity} onChange={(e) => setField('capacity', e.target.value)} placeholder="Max attendees" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>RSVP Required</Label><p className="text-xs text-muted-foreground">Require attendees to RSVP</p></div>
            <Switch checked={form.rsvpRequired} onCheckedChange={(v) => setField('rsvpRequired', v)} />
          </div>
          {form.rsvpRequired && (
            <div className="space-y-2">
              <Label>RSVP Deadline</Label>
              <Input type="date" value={form.rsvpDeadline} onChange={(e) => setField('rsvpDeadline', e.target.value)} />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Ticketed Event</Label><p className="text-xs text-muted-foreground">Enable ticket purchasing</p></div>
            <Switch checked={form.isTicketed} onCheckedChange={(v) => setField('isTicketed', v)} />
          </div>
          {form.isTicketed && (
            <div className="space-y-2">
              <Label>Ticket Price (Rands)</Label>
              <Input type="number" min="0" step="0.01" value={form.ticketPrice} onChange={(e) => setField('ticketPrice', e.target.value)} placeholder="e.g. 50.00" />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Gallery Enabled</Label><p className="text-xs text-muted-foreground">Allow photo uploads</p></div>
            <Switch checked={form.galleryEnabled} onCheckedChange={(v) => setField('galleryEnabled', v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
