'use client';

import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AssessmentStructure, StructureStatus } from '@/types';

type BadgeVariant = 'secondary' | 'default' | 'destructive';

const STATUS_BADGE: Record<StructureStatus, BadgeVariant> = {
  draft: 'secondary',
  active: 'default',
  locked: 'destructive',
};

const STATUS_LABEL: Record<StructureStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  locked: 'Locked',
};

interface Props {
  structures: AssessmentStructure[];
  onSelect: (id: string) => void;
}

export function AssessmentStructureList({ structures, onSelect }: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {structures.map((structure) => (
        <Card
          key={structure.id}
          className="cursor-pointer transition-all hover:ring-2 hover:ring-ring"
          onClick={() => onSelect(structure.id)}
        >
          <CardContent className="flex flex-col gap-3 pt-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="size-4 shrink-0 text-muted-foreground" />
                <h3 className="font-medium truncate">{structure.name}</h3>
              </div>
              <Badge variant={STATUS_BADGE[structure.status]}>
                {STATUS_LABEL[structure.status]}
              </Badge>
            </div>

            {/* Subject */}
            {structure.subjectName && (
              <p className="text-sm text-muted-foreground truncate">
                {structure.subjectName}
              </p>
            )}

            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">Term {structure.term}</Badge>
              <Badge variant="outline">{structure.academicYear}</Badge>
              <Badge variant="secondary">
                {structure.categories.length} categor{structure.categories.length === 1 ? 'y' : 'ies'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
