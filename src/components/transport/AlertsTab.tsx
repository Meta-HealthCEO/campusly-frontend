'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Trash2, CheckCircle, AlertTriangle, CloudRain,
  Wrench, Route, Siren, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import type {
  BusRoute, TransportAlert, AlertType, AlertSeverity,
  PopulatedRoute,
} from '@/hooks/useTransport';

const ALERT_TYPE_ICONS: Record<AlertType, React.ReactNode> = {
  delay: <Clock className="h-4 w-4 text-amber-500" />,
  breakdown: <Wrench className="h-4 w-4 text-red-500" />,
  route_change: <Route className="h-4 w-4 text-blue-500" />,
  emergency: <Siren className="h-4 w-4 text-red-600" />,
  weather: <CloudRain className="h-4 w-4 text-sky-500" />,
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  delay: 'Delay',
  breakdown: 'Breakdown',
  route_change: 'Route Change',
  emergency: 'Emergency',
  weather: 'Weather',
};

function getRouteName(r: PopulatedRoute | string | null | undefined): string {
  if (!r) return 'School-wide';
  if (typeof r === 'string') return r;
  return r.name ?? r._id;
}

interface AlertsTabProps {
  alerts: TransportAlert[];
  routes: BusRoute[];
  onCreateAlert: (data: {
    routeId?: string; type: AlertType; title: string;
    message: string; severity: AlertSeverity;
  }) => Promise<void>;
  onResolveAlert: (id: string) => Promise<void>;
  onDeleteAlert: (id: string) => Promise<void>;
  onFetchAlerts: (isResolved?: boolean) => Promise<void>;
}

export function AlertsTab({
  alerts, routes, onCreateAlert, onResolveAlert, onDeleteAlert, onFetchAlerts,
}: AlertsTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransportAlert | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formRouteId, setFormRouteId] = useState('');
  const [formType, setFormType] = useState<AlertType>('delay');
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSeverity, setFormSeverity] = useState<AlertSeverity>('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleToggleResolved = (val: boolean) => {
    setShowResolved(val);
    onFetchAlerts(val ? undefined : false);
  };

  const resetForm = () => {
    setFormRouteId('');
    setFormType('delay');
    setFormTitle('');
    setFormMessage('');
    setFormSeverity('medium');
  };

  const handleCreateAlert = async () => {
    if (!formTitle.trim() || !formMessage.trim()) return;
    setSubmitting(true);
    try {
      await onCreateAlert({
        routeId: formRouteId || undefined,
        type: formType,
        title: formTitle.trim(),
        message: formMessage.trim(),
        severity: formSeverity,
      });
      setCreateOpen(false);
      resetForm();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteAlert(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Operation failed';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const filteredAlerts = showResolved
    ? alerts
    : alerts.filter((a) => !a.isResolved);

  const columns: ColumnDef<TransportAlert, unknown>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {ALERT_TYPE_ICONS[row.original.type]}
          <span>{ALERT_TYPE_LABELS[row.original.type] ?? row.original.type}</span>
        </div>
      ),
    },
    { accessorKey: 'title', header: 'Title' },
    {
      id: 'route',
      header: 'Route',
      cell: ({ row }) => getRouteName(row.original.routeId),
    },
    {
      id: 'severity',
      header: 'Severity',
      cell: ({ row }) => <AlertSeverityBadge severity={row.original.severity} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        if (row.original.isResolved) {
          return (
            <Badge className="bg-emerald-100 text-emerald-700">
              <CheckCircle className="h-3 w-3 mr-1" /> Resolved
            </Badge>
          );
        }
        return <Badge className="bg-amber-100 text-amber-700">Active</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {!row.original.isResolved && (
            <Button variant="outline" size="sm" onClick={() => onResolveAlert(row.original.id)}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteTarget(row.original)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showResolved} onCheckedChange={handleToggleResolved} />
          Show resolved alerts
        </label>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Alert
        </Button>
      </div>

      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No alerts"
          description={showResolved ? 'No transport alerts found.' : 'No active transport alerts.'}
        />
      ) : (
        <DataTable columns={columns} data={filteredAlerts} searchKey="title" searchPlaceholder="Search alerts..." />
      )}

      {/* Create Alert Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Transport Alert</DialogTitle>
            <DialogDescription>Broadcast an alert to the school community.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Alert title" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)} placeholder="Describe the situation..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(val: unknown) => setFormType(val as AlertType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map((t) => (
                      <SelectItem key={t} value={t}>{ALERT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={formSeverity} onValueChange={(val: unknown) => setFormSeverity(val as AlertSeverity)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Route (optional - leave blank for school-wide)</Label>
              <Select value={formRouteId || 'none'} onValueChange={(val: unknown) => setFormRouteId(val === 'none' ? '' : (val as string))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">School-wide</SelectItem>
                  {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAlert} disabled={submitting || !formTitle.trim() || !formMessage.trim()}>
              {submitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this alert? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
