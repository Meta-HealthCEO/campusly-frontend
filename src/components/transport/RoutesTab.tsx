'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bus, MapPin, Phone, Users, Pencil, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { RouteFormDialog } from './RouteFormDialog';
import type { BusRoute } from '@/hooks/useTransport';

interface RoutesTabProps {
  routes: BusRoute[];
  onCreateRoute: (data: Omit<BusRoute, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateRoute: (id: string, data: Partial<BusRoute>) => Promise<void>;
  onDeleteRoute: (id: string) => Promise<void>;
}

export function RoutesTab({ routes, onCreateRoute, onUpdateRoute, onDeleteRoute }: RoutesTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<BusRoute | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BusRoute | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (route: BusRoute) => {
    setEditRoute(route);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteRoute(deleteTarget.id);
      setDeleteDialogOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditRoute(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Route
        </Button>
      </div>

      {routes.length === 0 ? (
        <EmptyState icon={Bus} title="No routes" description="No transport routes have been configured yet." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              onEdit={() => handleEdit(route)}
              onDelete={() => { setDeleteTarget(route); setDeleteDialogOpen(true); }}
            />
          ))}
        </div>
      )}

      <RouteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editRoute={editRoute}
        onSubmit={onCreateRoute}
        onUpdate={onUpdateRoute}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Route</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── RouteCard ── */

function RouteCard({ route, onEdit, onDelete }: {
  route: BusRoute;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="h-5 w-5 text-primary" />
            {route.name}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                route.isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }
            >
              {route.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button variant="ghost" size="icon-sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium">Driver Information</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {route.driverName}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <a href={`tel:${route.driverPhone.replace(/\s/g, '')}`} className="text-primary hover:underline">
              {route.driverPhone}
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Vehicle: <span className="font-mono font-semibold">{route.vehicleRegistration}</span>
          </p>
          <p className="text-sm text-muted-foreground">Capacity: {route.capacity}</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Stops</p>
          <div className="space-y-2">
            {route.stops.map((stop, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  {index < route.stops.length - 1 && <div className="h-4 w-px bg-border" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{stop.name}</p>
                    <span className="text-xs text-muted-foreground">{stop.time}</span>
                  </div>
                  {(stop.latitude != null && stop.longitude != null) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
