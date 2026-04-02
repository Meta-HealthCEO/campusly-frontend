'use client';

import { useEffect } from 'react';
import { Eye, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { useMessageDetail } from '@/hooks/useCommunication';

interface ReadReceiptDashboardProps {
  readStats: ReturnType<typeof useMessageDetail>['readStats'];
  readReceipts: ReturnType<typeof useMessageDetail>['readReceipts'];
  onLoadReceipts: () => void;
  loading?: boolean;
}

function formatRecipientName(
  userId: { id: string; firstName: string; lastName: string; email: string } | string,
): string {
  if (typeof userId === 'string') return userId;
  return [userId.firstName, userId.lastName].filter(Boolean).join(' ') || userId.email;
}

export function ReadReceiptDashboard({
  readStats,
  readReceipts,
  onLoadReceipts,
  loading,
}: ReadReceiptDashboardProps) {
  useEffect(() => {
    if (readReceipts.length === 0 && readStats && readStats.readCount > 0) {
      onLoadReceipts();
    }
  }, [readStats, readReceipts.length, onLoadReceipts]);

  if (loading) return <LoadingSpinner />;

  if (!readStats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No read receipt data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Total Recipients</p>
              <p className="text-lg font-semibold">{readStats.totalRecipients}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Read</p>
              <p className="text-lg font-semibold">{readStats.readCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Time to Read</p>
              <p className="text-lg font-semibold">{readStats.avgTimeToReadMinutes} min</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Read Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={readStats.readPercentage} className="flex-1" />
            <span className="text-sm font-medium">{readStats.readPercentage}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Recipient list */}
      {readReceipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Who Read</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {readReceipts.map((receipt, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                  <span className="truncate">{formatRecipientName(receipt.userId)}</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap ml-2">
                    {new Date(receipt.readAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
