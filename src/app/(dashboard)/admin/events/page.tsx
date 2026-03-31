'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EventCard } from '@/components/events/EventCard';
import { EventFormDialog } from '@/components/events/EventFormDialog';
import { DeleteEventDialog } from '@/components/events/DeleteEventDialog';
import { EventFilterBar } from '@/components/events/EventFilterBar';
import { useEvents, useEventCrud } from '@/hooks/useEvents';
import type { EventRecord, EventType } from '@/components/events/types';

export default function AdminEventsPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const activeFilter = filterType === 'all' ? undefined : filterType;
  const { events, loading, refetch } = useEvents(activeFilter);
  const { createEvent, updateEvent, deleteEvent } = useEventCrud();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleEdit = (event: EventRecord) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleDelete = (event: EventRecord) => {
    setDeleteTarget(event);
    setDeleteOpen(true);
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Manage school events and activities">
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </PageHeader>

      <EventFilterBar filterType={filterType} onFilterChange={setFilterType} />

      {sortedEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events"
          description={filterType === 'all' ? 'No events have been created yet.' : 'No events match the selected filter.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              showActions
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClick={(e) => router.push(`/admin/events/${e.id}`)}
            />
          ))}
        </div>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        onCreate={createEvent}
        onUpdate={updateEvent}
        onSuccess={refetch}
      />

      <DeleteEventDialog
        event={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={deleteEvent}
        onSuccess={refetch}
      />
    </div>
  );
}
