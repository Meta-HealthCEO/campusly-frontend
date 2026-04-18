'use client';

import { useMemo, useState } from 'react';
import { Plus, HeartPulse, Pencil, Trash2, FileText, CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { InjuryFormDialog } from '@/components/sport/InjuryFormDialog';
import { RecoveryLogDialog } from '@/components/sport/RecoveryLogDialog';
import { useTeams } from '@/hooks/useSport';
import {
  useInjuries, useRecoveryLogs, deleteInjury,
} from '@/hooks/useInjuries';
import {
  BODY_PART_LABELS, INJURY_TYPE_LABELS, SEVERITY_LABELS,
  STATUS_LABELS, CLEARANCE_LABELS,
  type InjuryRecord, type InjurySeverity, type InjuryStatus,
} from '@/types/injury';

function playerName(p: InjuryRecord['studentId']): string {
  if (typeof p === 'string') return 'Player';
  return `${p.firstName} ${p.lastName}`;
}

function severityVariant(
  sev: InjurySeverity,
): 'default' | 'secondary' | 'destructive' {
  if (sev === 'severe') return 'destructive';
  if (sev === 'moderate') return 'default';
  return 'secondary';
}

function statusVariant(
  status: InjuryStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'active') return 'destructive';
  if (status === 'recovering') return 'default';
  if (status === 'cleared') return 'secondary';
  return 'outline';
}

export default function CoachInjuriesPage() {
  const { teams } = useTeams();
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const filters = statusFilter === 'all' ? {} : { status: statusFilter };
  const { injuries, loading, refetch } = useInjuries(filters);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InjuryRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState<InjuryRecord | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const activeCount = useMemo(
    () => injuries.filter((i) => i.status === 'active' || i.status === 'recovering').length,
    [injuries],
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(injury: InjuryRecord) {
    setEditing(injury);
    setFormOpen(true);
  }

  async function handleDelete(injury: InjuryRecord) {
    if (!confirm(`Delete this injury record for ${playerName(injury.studentId)}?`)) return;
    try {
      await deleteInjury(injury.id);
      await refetch();
    } catch {
      // toast handled in hook
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Injuries & Recovery" description={`${activeCount} active or recovering`}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as string)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="recovering">Recovering</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Record injury
          </Button>
        </div>
      </PageHeader>

      {loading && injuries.length === 0 ? (
        <LoadingSpinner />
      ) : injuries.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No injuries recorded"
          description="Log a new injury to start tracking recovery."
        />
      ) : (
        <div className="grid gap-3">
          {injuries.map((injury) => (
            <Card key={injury.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold truncate">{playerName(injury.studentId)}</h3>
                      <Badge variant={statusVariant(injury.status)}>{STATUS_LABELS[injury.status]}</Badge>
                      <Badge variant={severityVariant(injury.severity)}>{SEVERITY_LABELS[injury.severity]}</Badge>
                    </div>
                    <p className="text-sm">
                      {BODY_PART_LABELS[injury.bodyPart]} · {INJURY_TYPE_LABELS[injury.type]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Injured {new Date(injury.injuryDate).toLocaleDateString()}
                      {injury.expectedReturnDate && ` · Expected return ${new Date(injury.expectedReturnDate).toLocaleDateString()}`}
                    </p>
                    {injury.clearanceLevel !== 'none' && (
                      <Badge variant="outline" className="text-xs">
                        {CLEARANCE_LABELS[injury.clearanceLevel]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDetailOpen(injury)}>
                      <FileText className="mr-1 h-4 w-4" />
                      Recovery
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(injury)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(injury)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InjuryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        injury={editing}
        teams={teams}
        onSuccess={refetch}
      />

      <Dialog open={!!detailOpen} onOpenChange={(o) => !o && setDetailOpen(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recovery timeline</DialogTitle>
            <DialogDescription>
              {detailOpen ? `${playerName(detailOpen.studentId)} · ${BODY_PART_LABELS[detailOpen.bodyPart]} ${INJURY_TYPE_LABELS[detailOpen.type]}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto py-2">
            {detailOpen && (
              <RecoveryTimeline
                injury={detailOpen}
                onAddLog={() => setRecoveryOpen(true)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {detailOpen && (
        <RecoveryLogDialog
          open={recoveryOpen}
          onOpenChange={setRecoveryOpen}
          injuryId={detailOpen.id}
          onSuccess={() => {
            /* timeline refetch is triggered by RecoveryTimeline's hook */
          }}
        />
      )}
    </div>
  );
}

function RecoveryTimeline({
  injury,
  onAddLog,
}: {
  injury: InjuryRecord;
  onAddLog: () => void;
}) {
  const { logs, loading, refetch } = useRecoveryLogs(injury.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Status: <span className="font-medium text-foreground">{STATUS_LABELS[injury.status]}</span>
          {' · '}
          Clearance: <span className="font-medium text-foreground">{CLEARANCE_LABELS[injury.clearanceLevel]}</span>
        </div>
        <Button size="sm" onClick={() => { onAddLog(); setTimeout(refetch, 500); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add log
        </Button>
      </div>

      {loading && logs.length === 0 ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No recovery logs yet"
          description="Add a log to track progress over time."
        />
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">
                    {new Date(log.date).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {log.painLevel != null && <span>Pain {log.painLevel}/10</span>}
                    {log.mobilityScore != null && <span>Mobility {log.mobilityScore}/10</span>}
                  </div>
                  {log.activitiesPerformed.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Activities: {log.activitiesPerformed.join(', ')}
                    </p>
                  )}
                  {log.notes && <p className="text-sm">{log.notes}</p>}
                  {log.nextMilestone && (
                    <p className="text-xs italic text-muted-foreground">
                      Next: {log.nextMilestone}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
