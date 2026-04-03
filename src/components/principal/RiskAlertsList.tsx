'use client';

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RiskAlert } from '@/types';

interface RiskAlertsListProps {
  alerts: RiskAlert[];
}

function severityConfig(severity: RiskAlert['severity']) {
  switch (severity) {
    case 'high':
      return {
        icon: AlertTriangle,
        badge: 'destructive' as const,
        bg: 'bg-destructive/10 border-destructive/20',
      };
    case 'medium':
      return {
        icon: AlertCircle,
        badge: 'secondary' as const,
        bg: 'bg-amber-500/10 border-amber-500/20',
      };
    case 'low':
    default:
      return {
        icon: Info,
        badge: 'outline' as const,
        bg: 'bg-blue-500/10 border-blue-500/20',
      };
  }
}

export function RiskAlertsList({ alerts }: RiskAlertsListProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((alert, idx) => {
        const config = severityConfig(alert.severity);
        const Icon = config.icon;
        return (
          <Card key={`${alert.type}-${idx}`} className={cn('border', config.bg)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={config.badge} className="text-xs uppercase">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{alert.message}</p>
                  {alert.details && alert.details.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {alert.details.slice(0, 3).map((d) => (
                        <li key={d.classId} className="text-xs text-muted-foreground">
                          {d.className} — {d.subjectName}: {d.passRate}%
                        </li>
                      ))}
                      {alert.details.length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{alert.details.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
