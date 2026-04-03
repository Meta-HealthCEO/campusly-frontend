'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/incidents/SeverityBadge';
import { IncidentStatusBadge } from '@/components/incidents/IncidentStatusBadge';
import { FollowUpList } from '@/components/incidents/FollowUpList';
import { AddActionDialog } from '@/components/incidents/AddActionDialog';
import { StatusTimeline } from '@/components/incidents/StatusTimeline';
import { ConfidentialNoteSection } from '@/components/incidents/ConfidentialNoteSection';
import { Plus, ArrowRight } from 'lucide-react';
import { useIncidents } from '@/hooks/useIncidents';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CreateActionPayload, IncidentStatus } from '@/types';

const NEXT_STATUS: Partial<Record<IncidentStatus, IncidentStatus>> = {
  reported: 'investigating',
  investigating: 'resolved',
  escalated: 'resolved',
};

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isCounselor = hasPermission('isCounselor');
  const isPrincipal = hasPermission('isSchoolPrincipal');
  const canViewNotes = isCounselor || isPrincipal || user?.role === 'super_admin';
  const canCreateNotes = isCounselor || user?.role === 'super_admin';

  const {
    selectedIncident: incident, actions, notes,
    fetchIncident, fetchActions, fetchNotes,
    updateIncident, createAction, updateAction, createNote,
  } = useIncidents();

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      await fetchIncident(id);
      await fetchActions(id);
      if (canViewNotes) await fetchNotes(id);
    } finally {
      setLoading(false);
    }
  }, [id, canViewNotes, fetchIncident, fetchActions, fetchNotes]);

  useEffect(() => { loadData(); }, [id]);

  if (loading || !incident) return <LoadingSpinner />;

  const nextStatus = NEXT_STATUS[incident.status];

  const handleStatusChange = async (status: IncidentStatus) => {
    await updateIncident(id, { status });
    await fetchIncident(id);
  };

  const handleCreateAction = async (data: CreateActionPayload) => {
    await createAction(id, data);
    await fetchActions(id);
  };

  const handleCompleteAction = async (actionId: string) => {
    await updateAction(id, actionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    await fetchActions(id);
  };

  const handleAddNote = async (content: string) => {
    await createNote(id, content);
    await fetchNotes(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={incident.title} description={`${incident.incidentNumber} — ${incident.type.replace(/_/g, ' ')}`}>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <IncidentStatusBadge status={incident.status} />
          {nextStatus && (
            <Button size="sm" onClick={() => handleStatusChange(nextStatus)}>
              <ArrowRight className="h-4 w-4 mr-1" />
              {nextStatus === 'investigating' ? 'Start Investigation' : 'Resolve'}
            </Button>
          )}
          {incident.status === 'investigating' && (
            <Button size="sm" variant="destructive"
              onClick={() => handleStatusChange('escalated')}>
              Escalate
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="details">
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="actions">Actions ({actions.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          {canViewNotes && <TabsTrigger value="notes">Confidential</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mt-4 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {new Date(incident.incidentDate).toLocaleDateString()}</div>
                {incident.incidentTime && <div><span className="text-muted-foreground">Time:</span> {incident.incidentTime}</div>}
                {incident.location && <div><span className="text-muted-foreground">Location:</span> {incident.location}</div>}
                <div><span className="text-muted-foreground">Reported by:</span> {incident.reportedBy?.firstName} {incident.reportedBy?.lastName}</div>
              </div>
              {incident.immediateActionTaken && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Immediate Action</p>
                  <p className="text-sm">{incident.immediateActionTaken}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {incident.involvedParties.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Involved Parties</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {incident.involvedParties.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="capitalize font-medium">{p.role}</span>
                      <span className="text-muted-foreground">
                        {typeof p.studentId === 'object' ? p.studentId.admissionNumber : p.studentId}
                      </span>
                      {p.description && <span className="text-muted-foreground">— {p.description}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setActionDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Action
            </Button>
          </div>
          <FollowUpList actions={actions} onComplete={handleCompleteAction} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <StatusTimeline history={incident.statusHistory} />
            </CardContent>
          </Card>
        </TabsContent>

        {canViewNotes && (
          <TabsContent value="notes" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <ConfidentialNoteSection
                  notes={notes}
                  canCreate={canCreateNotes}
                  onAdd={handleAddNote}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AddActionDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen} onSubmit={handleCreateAction} />
    </div>
  );
}
