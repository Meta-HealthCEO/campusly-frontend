'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { StatusUpdateDialog } from './StatusUpdateDialog';
import type { AdmissionApplication, AdmissionStatus } from '@/types/admissions';

const COLUMNS: { status: AdmissionStatus; label: string }[] = [
  { status: 'submitted', label: 'Submitted' },
  { status: 'under_review', label: 'Under Review' },
  { status: 'interview_scheduled', label: 'Interview' },
  { status: 'accepted', label: 'Accepted' },
  { status: 'waitlisted', label: 'Waitlisted' },
  { status: 'rejected', label: 'Rejected' },
];

const VALID_TRANSITIONS: Record<AdmissionStatus, AdmissionStatus[]> = {
  submitted: ['under_review'],
  under_review: ['interview_scheduled', 'accepted', 'waitlisted', 'rejected'],
  interview_scheduled: ['accepted', 'waitlisted', 'rejected'],
  waitlisted: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

interface Props {
  applications: AdmissionApplication[];
  onStatusChange: (id: string, status: AdmissionStatus, notes: string, notify: boolean) => Promise<void>;
  onCardClick: (app: AdmissionApplication) => void;
}

function gradeLabel(grade: number): string {
  return grade === 0 ? 'Grade R' : `Grade ${grade}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
}

export function ApplicationKanban({ applications, onStatusChange, onCardClick }: Props) {
  const [dragApp, setDragApp] = useState<AdmissionApplication | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    app: AdmissionApplication;
    toStatus: AdmissionStatus;
  } | null>(null);

  const grouped = useMemo(() => {
    const map: Record<AdmissionStatus, AdmissionApplication[]> = {
      submitted: [], under_review: [], interview_scheduled: [],
      accepted: [], waitlisted: [], rejected: [],
    };
    for (const app of applications) {
      if (map[app.status]) map[app.status].push(app);
    }
    return map;
  }, [applications]);

  const handleDragStart = useCallback((_e: React.DragEvent, app: AdmissionApplication) => {
    setDragApp(app);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: AdmissionStatus) => {
    e.preventDefault();
    if (!dragApp) return;
    if (dragApp.status === targetStatus) return;
    const allowed = VALID_TRANSITIONS[dragApp.status];
    if (!allowed.includes(targetStatus)) return;
    setStatusDialog({ app: dragApp, toStatus: targetStatus });
    setDragApp(null);
  }, [dragApp]);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col.status}
            className="min-w-[220px] flex-shrink-0 rounded-lg border bg-muted/30 p-2"
            onDragOver={handleDragOver}
            onDrop={(e: React.DragEvent) => handleDrop(e, col.status)}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs text-muted-foreground">{grouped[col.status].length}</span>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {grouped[col.status].map((app: AdmissionApplication) => (
                <Card
                  key={app.id || app._id}
                  draggable
                  onDragStart={(e: React.DragEvent) => handleDragStart(e, app)}
                  onClick={() => onCardClick(app)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3 space-y-1">
                    <p className="text-sm font-medium truncate">
                      {app.applicantFirstName} {app.applicantLastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{gradeLabel(app.gradeApplyingFor)}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{formatDate(app.createdAt)}</p>
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {grouped[col.status].length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No applications</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {statusDialog && (
        <StatusUpdateDialog
          open
          onOpenChange={(open: boolean) => { if (!open) setStatusDialog(null); }}
          applicationNumber={statusDialog.app.applicationNumber}
          fromStatus={statusDialog.app.status}
          toStatus={statusDialog.toStatus}
          onConfirm={async (notes: string, notify: boolean) => {
            await onStatusChange(
              statusDialog.app.id || statusDialog.app._id,
              statusDialog.toStatus,
              notes,
              notify,
            );
            setStatusDialog(null);
          }}
        />
      )}
    </>
  );
}
