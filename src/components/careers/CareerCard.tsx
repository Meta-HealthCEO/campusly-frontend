'use client';

import type { Career } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CareerCardProps {
  career: Career;
  onViewProgrammes?: (careerName: string) => void;
}

const DEMAND_CONFIG: Record<
  Career['demand'],
  { label: string; className: string }
> = {
  growing: { label: 'Growing', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  stable: { label: 'Stable', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  declining: { label: 'Declining', className: 'bg-destructive/10 text-destructive' },
};

function formatZAR(cents: number): string {
  return `R${(cents / 100).toLocaleString('en-ZA')}`;
}

export function CareerCard({ career, onViewProgrammes }: CareerCardProps) {
  const demandConfig = DEMAND_CONFIG[career.demand];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight truncate">{career.name}</h3>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${demandConfig.className}`}
          >
            {demandConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {career.cluster}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {career.description}
        </p>

        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            Salary range:{' '}
            <span className="font-medium text-foreground">
              {formatZAR(career.salaryRange.entry)} &mdash; {formatZAR(career.salaryRange.senior)}/year
            </span>
          </p>
          <p className="text-muted-foreground">
            Qualification:{' '}
            <span className="font-medium text-foreground">
              {career.requiredQualification}
            </span>
          </p>
        </div>

        {career.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {career.skills.map((skill: string) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {career.linkedProgrammeCount} linked{' '}
            {career.linkedProgrammeCount === 1 ? 'programme' : 'programmes'}
          </span>

          {onViewProgrammes && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewProgrammes(career.name)}
            >
              See Programmes
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
