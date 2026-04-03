'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DepreciationChart,
  DepreciationTable,
  ReplacementScheduleTable,
  MaintenanceCostChart,
} from '@/components/assets';
import { useAssetReports } from '@/hooks/useAssetReports';
import type { MaintenanceCostReport } from '@/types';

type TabKey = 'depreciation' | 'replacement' | 'maintenance';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'depreciation', label: 'Depreciation' },
  { key: 'replacement', label: 'Replacement' },
  { key: 'maintenance', label: 'Maintenance Costs' },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function AssetReportsPage() {
  const {
    depreciation,
    loading,
    fetchDepreciation,
    fetchMaintenanceCosts,
  } = useAssetReports();

  const [activeTab, setActiveTab] = useState<TabKey>('depreciation');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [maintenanceReport, setMaintenanceReport] = useState<MaintenanceCostReport | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  useEffect(() => {
    void fetchDepreciation();
  }, [fetchDepreciation]);

  useEffect(() => {
    if (activeTab !== 'maintenance') return;
    setMaintenanceLoading(true);
    fetchMaintenanceCosts(selectedYear)
      .then((report) => setMaintenanceReport(report))
      .catch((err: unknown) => console.error('Failed to fetch maintenance costs:', err))
      .finally(() => setMaintenanceLoading(false));
  }, [activeTab, selectedYear, fetchMaintenanceCosts]);

  const replacementAssets = useMemo(() => {
    if (!depreciation) return [];
    return depreciation.assets.filter((a) => a.usefulLifeRemaining <= 1);
  }, [depreciation]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Asset Reports"
        description="Depreciation, replacement scheduling, and maintenance cost analysis."
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1 w-full sm:w-auto sm:inline-flex">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'flex-1 sm:flex-none rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Depreciation tab */}
      {activeTab === 'depreciation' && (
        <div className="space-y-6">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="rounded-lg border bg-card p-4">
                <h2 className="text-sm font-semibold mb-4">Depreciation by Category</h2>
                <DepreciationChart report={depreciation} />
              </div>
              <DepreciationTable report={depreciation} />
            </>
          )}
        </div>
      )}

      {/* Replacement tab */}
      {activeTab === 'replacement' && (
        <div className="space-y-4">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Showing assets with 1 year or less of useful life remaining.
              </p>
              <ReplacementScheduleTable assets={replacementAssets} />
            </>
          )}
        </div>
      )}

      {/* Maintenance Costs tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="year-select" className="shrink-0 text-sm">
              Year
            </Label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v: unknown) => setSelectedYear(Number(v as string))}
            >
              <SelectTrigger id="year-select" className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {maintenanceLoading ? (
            <LoadingSpinner />
          ) : maintenanceReport === null ? (
            <EmptyState
              icon={BarChart2}
              title="No data"
              description="Select a year to view maintenance costs."
            />
          ) : (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-semibold mb-4">
                Maintenance Costs — {selectedYear}
              </h2>
              <MaintenanceCostChart report={maintenanceReport} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
