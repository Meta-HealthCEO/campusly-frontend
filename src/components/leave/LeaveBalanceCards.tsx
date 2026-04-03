'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LeaveTypeBadge } from './LeaveTypeBadge';
import type { LeaveBalance, LeaveType } from '@/types';

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
  staffId?: string;
}

export function LeaveBalanceCards({ balances, staffId }: LeaveBalanceCardsProps) {
  const displayBalance = useMemo(() => {
    if (staffId) {
      return balances.find((b) => b.staffId.id === staffId);
    }
    return balances[0] ?? null;
  }, [balances, staffId]);

  if (!displayBalance || displayBalance.balances.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No leave balances found.
      </p>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {displayBalance.balances.map((b) => {
        const usedPercent = b.entitlement > 0
          ? Math.min(100, Math.round((b.used / b.entitlement) * 100))
          : 0;
        return (
          <Card key={b.leaveType}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <LeaveTypeBadge type={b.leaveType as LeaveType} />
                <span className="text-xs text-muted-foreground">
                  {displayBalance.year}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Entitlement</p>
                  <p className="font-semibold">{b.entitlement} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Used</p>
                  <p className="font-semibold">{b.used} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pending</p>
                  <p className="font-semibold">{b.pending} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Remaining</p>
                  <p className="font-semibold">{b.remaining} days</p>
                </div>
              </div>
              <Progress value={usedPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {usedPercent}% used
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
