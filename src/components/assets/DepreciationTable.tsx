'use client';

import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { BarChart2 } from 'lucide-react';
import type { DepreciationReport, DepreciationAsset } from '@/types';

interface DepreciationTableProps {
  report: DepreciationReport | null;
}

export function DepreciationTable({ report }: DepreciationTableProps) {
  if (!report) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No depreciation data"
        description="Generate a depreciation report to see asset values."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 rounded-lg border bg-muted/40 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Total Purchase Value</p>
          <p className="text-lg font-semibold">{formatCurrency(report.totalPurchaseValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Current Value</p>
          <p className="text-lg font-semibold">{formatCurrency(report.totalCurrentValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Depreciation</p>
          <p className="text-lg font-semibold text-destructive">{formatCurrency(report.totalDepreciation)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium whitespace-nowrap">Asset Tag</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Name</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Purchase Date</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap text-right">Purchase Price</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap text-right">Current Value</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap text-right">Annual Depreciation</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap text-right">Useful Life Remaining</th>
            </tr>
          </thead>
          <tbody>
            {report.assets.map((asset: DepreciationAsset) => (
              <tr key={asset.assetId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{asset.assetTag}</td>
                <td className="px-3 py-2 max-w-[180px] truncate">{asset.name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {new Date(asset.purchaseDate).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">{formatCurrency(asset.purchasePrice)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right">{formatCurrency(asset.currentValue)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-destructive">
                  {formatCurrency(asset.annualDepreciation)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right">
                  {asset.usefulLifeRemaining <= 0 ? (
                    <span className="text-destructive font-medium">Expired</span>
                  ) : (
                    `${asset.usefulLifeRemaining} yr${asset.usefulLifeRemaining !== 1 ? 's' : ''}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {report.assets.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No assets in this report.</p>
        )}
      </div>
    </div>
  );
}
