'use client';

import type { SubjectWarning } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface SubjectImpactWarningProps {
  warnings: SubjectWarning[];
}

export function SubjectImpactWarning({
  warnings,
}: SubjectImpactWarningProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <Card className="bg-destructive/10 border-destructive/20">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <h3 className="font-semibold text-destructive">Important</h3>
        </div>

        <div className="space-y-3">
          {warnings.map((warning: SubjectWarning, index: number) => (
            <div key={index} className="space-y-0.5">
              <p className="text-sm font-medium">{warning.subject}</p>
              <p className="text-sm text-muted-foreground">{warning.impact}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
