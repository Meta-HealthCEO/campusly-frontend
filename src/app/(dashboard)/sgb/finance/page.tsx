'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  FinanceSummaryCards,
  IncomeExpenditureTrendChart,
  BudgetVsActualChart,
} from '@/components/sgb';
import { useSgbFinance } from '@/hooks/useSgbFinance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PERIODS = [
  { value: 'annual', label: 'Annual' },
  { value: 'term1', label: 'Term 1' },
  { value: 'term2', label: 'Term 2' },
  { value: 'term3', label: 'Term 3' },
  { value: 'term4', label: 'Term 4' },
  { value: 'q1', label: 'Q1' },
  { value: 'q2', label: 'Q2' },
  { value: 'q3', label: 'Q3' },
  { value: 'q4', label: 'Q4' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function SgbFinancePage() {
  const { summary, trends, period, year, loading, setPeriod, setYear } = useSgbFinance();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Overview" description="Aggregated financial data for SGB oversight">
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val: unknown) => setPeriod(val as string)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(val: unknown) => setYear(Number(val))}>
            <SelectTrigger className="w-full sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {summary && <FinanceSummaryCards summary={summary} />}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <IncomeExpenditureTrendChart trends={trends} />
        <BudgetVsActualChart data={summary?.budgetComparison ?? null} />
      </div>
    </div>
  );
}
