'use client';

import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import type { AssetSummaryReport } from '@/types';

interface AssetAlertBannerProps {
  summary: AssetSummaryReport | null;
}

interface AlertItem {
  key: string;
  icon: typeof AlertTriangle;
  message: string;
  level: 'warning' | 'critical';
}

export function AssetAlertBanner({ summary }: AssetAlertBannerProps) {
  if (!summary) return null;

  const alerts: AlertItem[] = [];

  if (summary.overdueCheckouts > 0) {
    alerts.push({
      key: 'overdue',
      icon: Clock,
      message: `${summary.overdueCheckouts} asset${summary.overdueCheckouts !== 1 ? 's' : ''} ${summary.overdueCheckouts !== 1 ? 'are' : 'is'} overdue for return. Follow up with borrowers immediately.`,
      level: 'critical',
    });
  }

  if (summary.insuranceExpiringSoon > 0) {
    alerts.push({
      key: 'insurance',
      icon: ShieldAlert,
      message: `${summary.insuranceExpiringSoon} insurance polic${summary.insuranceExpiringSoon !== 1 ? 'ies are' : 'y is'} expiring soon. Renew to maintain coverage.`,
      level: 'warning',
    });
  }

  if (summary.maintenanceDue > 0) {
    alerts.push({
      key: 'maintenance',
      icon: AlertTriangle,
      message: `${summary.maintenanceDue} asset${summary.maintenanceDue !== 1 ? 's have' : ' has'} scheduled maintenance due. Schedule service to avoid downtime.`,
      level: 'warning',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        const isCritical = alert.level === 'critical';
        return (
          <div
            key={alert.key}
            className={
              isCritical
                ? 'flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3'
                : 'flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200 p-3'
            }
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
