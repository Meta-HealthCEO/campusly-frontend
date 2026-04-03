'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useConferences } from '@/hooks/useConferences';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ConferenceEventCard, BookingTable, ConferenceReportPanel,
} from '@/components/conference';
import { CalendarDays, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ConferenceEvent, ConferenceEventStatus, CreateConferenceEventPayload } from '@/types';

const EMPTY_FORM: CreateConferenceEventPayload = {
  schoolId: '', title: '', date: '', startTime: '14:00', endTime: '18:00',
  venue: '', slotDurationMinutes: 15, breakBetweenMinutes: 5,
  maxBookingsPerParent: null, allowWaitlist: true,
};

export default function AdminConferencesPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const {
    events, eventsLoading, fetchEvents,
    createEvent, updateEvent, updateEventStatus, deleteEvent,
    bookings, bookingsLoading, fetchBookings,
    report, reportLoading, fetchReport,
  } = useConferences();

  const [activeTab, setActiveTab] = useState<string | number>('events');
  const [selectedEvent, setSelectedEvent] = useState<ConferenceEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (schoolId) fetchEvents({ schoolId, status: statusFilter === 'all' ? undefined : statusFilter as ConferenceEventStatus });
  }, [schoolId, statusFilter, fetchEvents]);

  useEffect(() => {
    if (selectedEvent) {
      fetchBookings(selectedEvent.id);
      fetchReport(selectedEvent.id);
    }
  }, [selectedEvent, fetchBookings, fetchReport]);

  const openCreate = useCallback(() => {
    setForm({ ...EMPTY_FORM, schoolId });
    setEditId(null);
    setDialogOpen(true);
  }, [schoolId]);

  const openEdit = useCallback((ev: ConferenceEvent) => {
    setForm({
      schoolId, title: ev.title, description: ev.description,
      date: ev.date.slice(0, 10), startTime: ev.startTime, endTime: ev.endTime,
      venue: ev.venue, slotDurationMinutes: ev.slotDurationMinutes,
      breakBetweenMinutes: ev.breakBetweenMinutes,
      maxBookingsPerParent: ev.maxBookingsPerParent, allowWaitlist: ev.allowWaitlist,
    });
    setEditId(ev.id);
    setDialogOpen(true);
  }, [schoolId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (editId) {
        await updateEvent(editId, form);
        toast.success('Event updated');
      } else {
        await createEvent(form);
        toast.success('Event created');
      }
      setDialogOpen(false);
      fetchEvents({ schoolId });
    } catch (err: unknown) {
      toast.error('Failed to save event');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [editId, form, updateEvent, createEvent, schoolId, fetchEvents]);

  const handleStatusChange = useCallback(async (ev: ConferenceEvent, status: ConferenceEventStatus) => {
    try {
      await updateEventStatus(ev.id, status);
      toast.success(`Event ${status}`);
      fetchEvents({ schoolId });
    } catch (err: unknown) {
      toast.error('Failed to update status');
      console.error(err);
    }
  }, [updateEventStatus, schoolId, fetchEvents]);

  const handleDelete = useCallback(async (ev: ConferenceEvent) => {
    try {
      await deleteEvent(ev.id);
      toast.success('Event deleted');
      setSelectedEvent(null);
      fetchEvents({ schoolId });
    } catch (err: unknown) {
      toast.error('Failed to delete event');
      console.error(err);
    }
  }, [deleteEvent, schoolId, fetchEvents]);

  const updateField = (key: keyof CreateConferenceEventPayload, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Conferences" description="Manage parent-teacher conference events">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Create Event</Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {eventsLoading ? <LoadingSpinner /> : events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No conference events" description="Create your first parent-teacher conference event." />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <ConferenceEventCard
              key={ev.id} event={ev}
              onClick={(e) => setSelectedEvent(e)}
              actions={
                <div className="flex flex-wrap gap-1">
                  {ev.status === 'draft' && (
                    <>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(ev); }}>Edit</Button>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(ev, 'published'); }}>Publish</Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(ev); }}>Delete</Button>
                    </>
                  )}
                  {ev.status === 'published' && (
                    <>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(ev); }}>Edit</Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleStatusChange(ev, 'cancelled'); }}>Cancel</Button>
                    </>
                  )}
                  {ev.status === 'in_progress' && (
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(ev, 'completed'); }}>Complete</Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {selectedEvent && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <h3 className="font-semibold mb-2">{selectedEvent.title}</h3>
          <TabsList className="flex-wrap">
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings" className="mt-4">
            {bookingsLoading ? <LoadingSpinner /> : bookings.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No bookings" description="No bookings have been made for this event yet." />
            ) : <BookingTable bookings={bookings} />}
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            {reportLoading ? <LoadingSpinner /> : report ? (
              <ConferenceReportPanel report={report} />
            ) : (
              <EmptyState icon={CalendarDays} title="No report data" description="Report data will appear once bookings are made." />
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Event' : 'Create Conference Event'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            <div>
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description ?? ''} onChange={(e) => updateField('description', e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Date <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} /></div>
              <div><Label>Venue</Label><Input value={form.venue ?? ''} onChange={(e) => updateField('venue', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time <span className="text-destructive">*</span></Label><Input type="time" value={form.startTime} onChange={(e) => updateField('startTime', e.target.value)} /></div>
              <div><Label>End Time <span className="text-destructive">*</span></Label><Input type="time" value={form.endTime} onChange={(e) => updateField('endTime', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Slot Duration (min)</Label><Input type="number" value={form.slotDurationMinutes ?? 15} onChange={(e) => updateField('slotDurationMinutes', Number(e.target.value))} min={5} max={60} /></div>
              <div><Label>Break Between (min)</Label><Input type="number" value={form.breakBetweenMinutes ?? 5} onChange={(e) => updateField('breakBetweenMinutes', Number(e.target.value))} min={0} max={30} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Bookings/Parent</Label><Input type="number" value={form.maxBookingsPerParent ?? ''} onChange={(e) => updateField('maxBookingsPerParent', e.target.value ? Number(e.target.value) : null)} min={1} placeholder="Unlimited" /></div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.allowWaitlist ?? true} onChange={(e) => updateField('allowWaitlist', e.target.checked)} />
                  Allow Waitlist
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.date}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
