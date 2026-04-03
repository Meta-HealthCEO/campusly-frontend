'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';
import type { PolicyAcknowledgement } from '@/types';

interface AcknowledgementTrackerProps {
  acknowledgements: PolicyAcknowledgement[];
  totalStaff: number;
}

function resolveUser(
  userId: PolicyAcknowledgement['userId'],
): { name: string; email: string } {
  if (typeof userId === 'string') {
    return { name: userId, email: '—' };
  }
  return {
    name: `${userId.firstName} ${userId.lastName}`,
    email: userId.email,
  };
}

export function AcknowledgementTracker({
  acknowledgements,
  totalStaff,
}: AcknowledgementTrackerProps) {
  const percent = useMemo(() => {
    if (totalStaff === 0) return 0;
    return Math.round((acknowledgements.length / totalStaff) * 100);
  }, [acknowledgements.length, totalStaff]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acknowledgement Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {acknowledgements.length} / {totalStaff} staff acknowledged
            </span>
            <span className="font-medium">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>

        {acknowledgements.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No acknowledgements yet"
            description="No staff members have acknowledged this policy."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Name</th>
                  <th className="text-left py-2 pr-4 font-medium">Email</th>
                  <th className="text-left py-2 pr-4 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Version</th>
                </tr>
              </thead>
              <tbody>
                {acknowledgements.map((ack) => {
                  const user = resolveUser(ack.userId);
                  return (
                    <tr key={ack.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <span className="truncate block max-w-[160px] font-medium">
                          {user.name}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        <span className="truncate block max-w-[180px]">
                          {user.email}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {new Date(ack.acknowledgedAt).toLocaleDateString('en-ZA')}
                      </td>
                      <td className="py-2 text-muted-foreground">v{ack.version}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
