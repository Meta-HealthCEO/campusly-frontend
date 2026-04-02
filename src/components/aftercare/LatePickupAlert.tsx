'use client';

import { AlertTriangle, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LatePickupEntry } from '@/hooks/useAftercareLatePickups';

interface LatePickupAlertProps {
  latePickups: LatePickupEntry[];
  loading: boolean;
}

export function LatePickupAlert({ latePickups, loading }: LatePickupAlertProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  if (latePickups.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5 text-emerald-500" />
          No late pickups at this time.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-300 dark:border-amber-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Late Pickup Alert ({latePickups.length} student{latePickups.length !== 1 ? 's' : ''})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {latePickups.map((entry) => (
          <div
            key={entry.studentId}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{entry.studentName}</p>
              <p className="text-xs text-muted-foreground">
                Checked in at {entry.checkInTime}
              </p>
              <Badge
                className="bg-destructive/10 text-destructive"
              >
                {entry.minutesLate} min late
              </Badge>
            </div>
            {entry.parentPhone && (
              <a
                href={`tel:${entry.parentPhone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {entry.parentPhone}
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
