'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurriculumBenchmarks } from '@/hooks/useCurriculumBenchmarks';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { BenchmarkGrid } from '@/components/curriculum';
import { Target } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateBenchmarkPayload } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export default function BenchmarkConfigPage() {
  const {
    benchmarks,
    benchmarksLoading,
    fetchBenchmarks,
    saveBenchmark,
  } = useCurriculumBenchmarks();

  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [saving, setSaving] = useState(false);

  const loadBenchmarks = useCallback(() => {
    fetchBenchmarks({ year: selectedYear });
  }, [fetchBenchmarks, selectedYear]);

  useEffect(() => {
    loadBenchmarks();
  }, [loadBenchmarks]);

  const handleSave = useCallback(async (data: CreateBenchmarkPayload) => {
    setSaving(true);
    try {
      await saveBenchmark({ ...data, year: selectedYear });
      toast.success('Benchmark saved');
    } catch (err: unknown) {
      toast.error('Failed to save benchmark');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [saveBenchmark, selectedYear]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benchmark Configuration"
        description="Set national benchmark targets by subject, grade, and term"
      />

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Year</span>
        <Select
          value={String(selectedYear)}
          onValueChange={(v: unknown) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-full sm:w-32">
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

      {benchmarksLoading ? (
        <LoadingSpinner />
      ) : benchmarks.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No benchmarks configured"
          description="No benchmark targets have been set for this year."
        />
      ) : (
        <BenchmarkGrid
          benchmarks={benchmarks}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
