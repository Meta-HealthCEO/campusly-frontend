'use client';

import type { ProgrammeMatch } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bookmark, Send } from 'lucide-react';
import { ProgrammeMatchBar } from './ProgrammeMatchBar';
import { SubjectGapList } from './SubjectGapList';

interface ProgrammeCardProps {
  match: ProgrammeMatch;
  onSave?: (programmeId: string) => void;
  onApply?: (programmeId: string) => void;
}

const STATUS_CONFIG: Record<
  ProgrammeMatch['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  eligible: { label: 'Eligible', variant: 'default' },
  close: { label: 'Close Match', variant: 'secondary' },
  not_eligible: { label: 'Not Eligible', variant: 'destructive' },
};

function formatTuition(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA')}`;
}

function formatDeadline(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProgrammeCard({ match, onSave, onApply }: ProgrammeCardProps) {
  const statusConfig = STATUS_CONFIG[match.status];

  return (
    <Card>
      <CardHeader className="pb-3">
        {/* University row */}
        <div className="flex items-center gap-2 flex-wrap">
          {match.universityLogo && (
            <img
              src={match.universityLogo}
              alt={`${match.universityName} logo`}
              className="h-6 w-6 rounded object-contain shrink-0"
            />
          )}
          <span className="text-sm font-medium text-muted-foreground truncate">
            {match.universityName}
          </span>
          <Badge variant="outline" className="shrink-0 text-xs">
            {match.faculty}
          </Badge>
          <Badge variant="outline" className="shrink-0 text-xs capitalize">
            {match.qualificationType.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Programme name + status */}
        <div className="flex items-start justify-between gap-2 mt-1">
          <h3 className="font-semibold leading-tight truncate">
            {match.programmeName}
          </h3>
          <Badge variant={statusConfig.variant} className="shrink-0">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Match fit */}
        <p className="text-sm text-muted-foreground">
          Overall fit: <span className="font-medium text-foreground">{match.overallFit}%</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* APS comparison bar */}
        <ProgrammeMatchBar
          apsRequired={match.apsRequired}
          apsActual={match.apsActual}
        />

        {/* Subject gaps */}
        <SubjectGapList
          subjectGaps={match.subjectGaps}
          missingSubjects={match.missingSubjects}
        />

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {match.annualTuition != null && (
              <span>Tuition: {formatTuition(match.annualTuition)}/yr</span>
            )}
            {match.applicationDeadline && (
              <span>Deadline: {formatDeadline(match.applicationDeadline)}</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSave(match.programmeId)}
              >
                <Bookmark className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
            {onApply && (
              <Button
                size="sm"
                onClick={() => onApply(match.programmeId)}
              >
                <Send className="h-4 w-4 mr-1" />
                Apply
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
