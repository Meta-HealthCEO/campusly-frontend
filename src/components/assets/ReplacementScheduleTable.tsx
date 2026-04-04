'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { CalendarClock } from 'lucide-react';
import type { DepreciationAsset } from '@/types';

interface ReplacementScheduleTableProps {
  assets: DepreciationAsset[];
}

function estimateReplacementDate(purchaseDate: string, usefulLifeYears: number): string {
  const purchase = new Date(purchaseDate);
  const replacement = new Date(purchase);
  replacement.setFullYear(replacement.getFullYear() + usefulLifeYears);
  return replacement.toLocaleDateString();
}

function inferUsefulLife(asset: DepreciationAsset): number {
  if (asset.annualDepreciation > 0 && asset.purchasePrice > 0) {
    return Math.round(asset.purchasePrice / asset.annualDepreciation);
  }
  return asset.usefulLifeRemaining > 0 ? asset.usefulLifeRemaining : 0;
}

export function ReplacementScheduleTable({ assets }: ReplacementScheduleTableProps) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No assets approaching end of life"
        description="Assets nearing their replacement date will appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-3 py-2 font-medium whitespace-nowrap">Asset Tag</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Name</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Purchase Date</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap text-right">Useful Life (yrs)</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap text-right">Remaining Life</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Replacement Due</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset: DepreciationAsset) => {
            const isExpired = asset.usefulLifeRemaining <= 0;
            const usefulLife = inferUsefulLife(asset);
            const rowClass = isExpired
              ? 'border-b last:border-0 bg-destructive/5 text-destructive'
              : 'border-b last:border-0 hover:bg-muted/30 transition-colors';

            return (
              <tr key={asset.assetId} className={rowClass}>
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{asset.assetTag}</td>
                <td className="px-3 py-2 max-w-45 truncate">{asset.name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {new Date(asset.purchaseDate).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">{usefulLife}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                  {isExpired ? (
                    <span className="text-destructive">Overdue</span>
                  ) : (
                    `${asset.usefulLifeRemaining} yr${asset.usefulLifeRemaining !== 1 ? 's' : ''}`
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {usefulLife > 0
                    ? estimateReplacementDate(asset.purchaseDate, usefulLife)
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
