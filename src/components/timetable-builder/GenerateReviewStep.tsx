'use client';

import { useState, useMemo } from 'react';
import { useCan } from '@/hooks/useCan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  PlayCircle, CheckCircle, RefreshCw, AlertTriangle, BarChart3,
} from 'lucide-react';
import { TimetableGrid } from './TimetableGrid';
import type {
  TimetableGeneration, TimetableConfig, TbTimetableEntry, LockedSlot, SchoolClass,
} from '@/types';

interface GenerateReviewStepProps {
  generation: TimetableGeneration | null;
  config: TimetableConfig | null;
  classes: SchoolClass[];
  generating: boolean;
  lockedSlots: LockedSlot[];
  onGenerate: (gradeId?: string, lockedSlots?: LockedSlot[]) => Promise<unknown>;
  onCommit: (id: string) => Promise<unknown>;
  selectedGradeId: string;
}

export function GenerateReviewStep({
  generation,
  config,
  classes,
  generating,
  lockedSlots,
  onGenerate,
  onCommit,
  selectedGradeId,
}: GenerateReviewStepProps) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [committing, setCommitting] = useState(false);
  const canManage = useCan('manage_academic_setup');

  const classEntries = useMemo((): TbTimetableEntry[] => {
    if (!generation?.result) return [];
    return generation.result.filter((e) => e.classId === selectedClassId);
  }, [generation, selectedClassId]);

  async function handleGenerate() {
    await onGenerate(selectedGradeId, lockedSlots);
  }

  async function handleCommit() {
    if (!generation?.id) return;
    setCommitting(true);
    try {
      await onCommit(generation.id);
    } finally {
      setCommitting(false);
    }
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <LoadingSpinner />
        <p className="text-lg font-medium">Generating timetable...</p>
        <p className="text-sm text-muted-foreground">
          This may take up to 30 seconds depending on school size.
        </p>
      </div>
    );
  }

  if (!generation || generation.status === 'configuring') {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={PlayCircle}
          title="Ready to generate"
          description="Review your configuration, then click generate to create the timetable."
        />
        <div className="flex justify-center">
          <Button size="lg" onClick={handleGenerate} disabled={!canManage}>
            <PlayCircle className="mr-2 h-5 w-5" /> Generate Timetable
          </Button>
        </div>
      </div>
    );
  }

  if (generation.status === 'failed') {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Generation Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generation.warnings.length > 0 ? (
              <ul className="space-y-1">
                {generation.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-muted-foreground">- {w.message}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                The algorithm could not satisfy all hard constraints. Try adjusting requirements or
                teacher availability.
              </p>
            )}
          </CardContent>
        </Card>
        <div className="flex justify-center">
          <Button onClick={handleGenerate} disabled={!canManage}>
            <RefreshCw className="mr-1 h-4 w-4" /> Regenerate
          </Button>
        </div>
      </div>
    );
  }

  // Completed
  return (
    <div className="space-y-4">
      {/* Score card */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{generation.score.total}%</span>
                <Badge variant={generation.score.total >= 80 ? 'default' : 'secondary'}>
                  {generation.score.total >= 90 ? 'Excellent' : generation.score.total >= 80 ? 'Good' : 'Fair'}
                </Badge>
              </div>
              <Progress value={generation.score.total} />
              {generation.score.details.map((d) => (
                <div key={d.constraint} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{d.constraint}</span>
                  <span className="font-medium">{d.score}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Warnings ({generation.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generation.warnings.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-primary" /> No warnings
              </p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {generation.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                    {w.message}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Class timetable view */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">View class:</span>
        <Select value={selectedClassId} onValueChange={(v: unknown) => setSelectedClassId(v as string)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.gradeName ?? c.grade?.name ?? ''} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClassId && (
        <TimetableGrid entries={classEntries} config={config} />
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <Button variant="outline" onClick={handleGenerate} disabled={!canManage}>
          <RefreshCw className="mr-1 h-4 w-4" /> Regenerate
        </Button>
        <Button onClick={handleCommit} disabled={committing || !canManage}>
          <CheckCircle className="mr-1 h-4 w-4" />
          {committing ? 'Committing...' : 'Accept & Commit'}
        </Button>
      </div>
    </div>
  );
}
