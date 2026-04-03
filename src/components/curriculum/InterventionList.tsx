'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ShieldAlert } from 'lucide-react';
import type { CurriculumIntervention, InterventionStatus } from '@/types';

interface InterventionListProps {
  interventions: CurriculumIntervention[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

function StatusBadge({ status }: { status: InterventionStatus }) {
  switch (status) {
    case 'active':
      return <Badge variant="destructive">Active</Badge>;
    case 'acknowledged':
      return <Badge className="bg-amber-500 text-white">Acknowledged</Badge>;
    case 'resolved':
      return <Badge className="bg-emerald-600 text-white">Resolved</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function PacingBar({ actual, expected }: { actual: number; expected: number }) {
  return (
    <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="absolute h-full bg-destructive/70 rounded-full"
        style={{ width: `${Math.min(actual, 100)}%` }}
      />
      <div
        className="absolute h-full w-0.5 bg-foreground/40"
        style={{ left: `${Math.min(expected, 100)}%` }}
        title={`Expected: ${expected}%`}
      />
    </div>
  );
}

function InterventionCard({
  intervention,
  onAcknowledge,
  onResolve,
}: {
  intervention: CurriculumIntervention;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}) {
  const teacher = intervention.teacherId;
  const teacherName = `${teacher.firstName} ${teacher.lastName}`;
  const plan = intervention.planId;
  const subjectName = plan.subjectId.name;
  const gradeName = plan.gradeId.name;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{teacherName}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              {subjectName} &middot; {gradeName}
            </p>
          </div>
          <StatusBadge status={intervention.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{intervention.reason}</p>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Behind</span>
            <p>{intervention.weeksBehind} week{intervention.weeksBehind !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <span className="font-medium text-foreground">Pacing</span>
            <p className="text-destructive">{intervention.pacingPercent}%</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="font-medium text-foreground">Expected</span>
            <p>{intervention.expectedPercent}%</p>
          </div>
        </div>

        <PacingBar
          actual={intervention.pacingPercent}
          expected={intervention.expectedPercent}
        />

        {intervention.notes && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">
            {intervention.notes}
          </p>
        )}

        <div className="flex gap-2 flex-wrap pt-1">
          {intervention.status === 'active' && onAcknowledge && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcknowledge(intervention.id)}
            >
              Acknowledge
            </Button>
          )}
          {intervention.status === 'acknowledged' && onResolve && (
            <Button
              size="sm"
              onClick={() => onResolve(intervention.id)}
            >
              Resolve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function InterventionList({
  interventions,
  onAcknowledge,
  onResolve,
}: InterventionListProps) {
  if (interventions.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No interventions"
        description="Curriculum interventions will be flagged automatically when teachers fall significantly behind pacing."
      />
    );
  }

  return (
    <div className="space-y-3">
      {interventions.map((intervention) => (
        <InterventionCard
          key={intervention.id}
          intervention={intervention}
          onAcknowledge={onAcknowledge}
          onResolve={onResolve}
        />
      ))}
    </div>
  );
}
