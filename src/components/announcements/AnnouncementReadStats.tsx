'use client';

import { useState, useCallback } from 'react';
import { Eye, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReadAnalytics {
  readCount: number;
  targetAudience: string;
  roleBreakdown: Record<string, number>;
  readers: Array<{
    user: { _id: string; firstName: string; lastName: string; email: string; role: string } | string;
    readAt: string;
  }>;
}

interface AnnouncementReadStatsProps {
  announcementId: string;
  totalAudienceEstimate?: number;
  getReadAnalytics: (id: string) => Promise<ReadAnalytics>;
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AnnouncementReadStats({
  announcementId,
  totalAudienceEstimate,
  getReadAnalytics,
}: AnnouncementReadStatsProps) {
  const [data, setData] = useState<ReadAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReadAnalytics(announcementId);
      setData(result);
    } catch {
      console.error('Failed to load read analytics');
    } finally {
      setLoading(false);
    }
  }, [announcementId, getReadAnalytics]);

  if (!data) {
    return (
      <Button variant="outline" size="sm" onClick={load} disabled={loading}>
        <Eye className="mr-2 h-4 w-4" />
        {loading ? 'Loading...' : 'View Read Stats'}
      </Button>
    );
  }

  const percentage = totalAudienceEstimate && totalAudienceEstimate > 0
    ? Math.round((data.readCount / totalAudienceEstimate) * 100)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" /> Read Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-semibold">{data.readCount}</span> readers
            {percentage !== null && (
              <span className="text-muted-foreground"> ({percentage}%)</span>
            )}
          </span>
        </div>

        {percentage !== null && (
          <Progress value={percentage} className="h-2" />
        )}

        {/* Role breakdown */}
        {Object.keys(data.roleBreakdown).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.roleBreakdown).map(([role, count]) => (
              <Badge key={role} variant="secondary">
                {formatRole(role)}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
