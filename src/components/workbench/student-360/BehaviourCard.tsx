'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Student360Behaviour } from '@/types';

interface BehaviourCardProps {
  data: Student360Behaviour;
}

export function BehaviourCard({ data }: BehaviourCardProps) {
  const scoreClass =
    data.netMeritScore >= 0 ? 'text-emerald-600' : 'text-destructive';

  const recentIncidents = data.recentIncidents.slice(0, 5);
  const recentMerits = data.recentMerits.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Behaviour</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Net Merit Score</p>
          <p className={`text-3xl font-bold ${scoreClass}`}>
            {data.netMeritScore >= 0 ? '+' : ''}
            {data.netMeritScore}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Recent Incidents</p>
          {recentIncidents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent incidents</p>
          ) : (
            <ul className="space-y-1">
              {recentIncidents.map((incident, idx) => (
                <li
                  key={idx}
                  className="text-xs border-l-2 border-destructive pl-2"
                >
                  <span className="text-muted-foreground">
                    {incident.date.slice(0, 10)} &middot; {incident.type} &middot;{' '}
                    {incident.severity}
                  </span>
                  <p className="truncate">{incident.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Recent Merits</p>
          {recentMerits.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent merits</p>
          ) : (
            <ul className="space-y-1">
              {recentMerits.map((merit, idx) => (
                <li
                  key={idx}
                  className="text-xs border-l-2 border-emerald-500 pl-2"
                >
                  <span className="text-muted-foreground">
                    {merit.date.slice(0, 10)} &middot; {merit.category} &middot; +
                    {merit.points}pts
                  </span>
                  <p className="truncate">{merit.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
