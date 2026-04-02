'use client';

import type { Bursary } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Bookmark, Calendar } from 'lucide-react';

interface BursaryCardProps {
  bursary: Bursary;
  matched?: boolean;
  onSave?: (id: string) => void;
}

function formatDeadline(dateStr?: string): string {
  if (!dateStr) return 'No deadline set';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatZAR(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA')}/year`;
}

export function BursaryCard({ bursary, matched, onSave }: BursaryCardProps) {
  return (
    <Card className={matched ? 'border-primary' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base font-bold">
              {bursary.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              {bursary.provider}
            </p>
          </div>
          {matched && <Badge>Matched</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {bursary.coverageDetails && (
          <p className="text-sm">{bursary.coverageDetails}</p>
        )}

        {bursary.eligibilityCriteria && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {bursary.eligibilityCriteria}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {bursary.minimumAPS != null && (
            <Badge variant="secondary">Min APS: {bursary.minimumAPS}</Badge>
          )}
          {bursary.fieldOfStudy.map((field: string) => (
            <Badge key={field} variant="outline" className="text-xs">
              {field}
            </Badge>
          ))}
        </div>

        {bursary.annualValue != null && (
          <p className="text-sm font-medium">
            {formatZAR(bursary.annualValue)}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between pt-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDeadline(bursary.applicationCloseDate)}
          </span>

          <div className="flex gap-2">
            {bursary.applicationUrl && (
              <Button
                size="sm"
                asChild
              >
                <a
                  href={bursary.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Apply
                </a>
              </Button>
            )}
            {onSave && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSave(bursary.id)}
              >
                <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
