'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/shared/EmptyState';
import { TrendingUp } from 'lucide-react';

interface TermEntry {
  term: number;
  passRate: number;
  averageScore: number;
  targetPassRate: number;
}

interface YearData {
  year: number;
  terms: TermEntry[];
}

interface BenchmarkTrendChartProps {
  trends: YearData[] | null;
}

interface ChartRow {
  label: string;
  passRate: number;
  targetPassRate: number;
}

function buildChartData(trends: YearData[]): ChartRow[] {
  const rows: ChartRow[] = [];
  for (const yearData of trends) {
    for (const t of yearData.terms) {
      rows.push({
        label: `T${t.term} ${yearData.year}`,
        passRate: t.passRate,
        targetPassRate: t.targetPassRate,
      });
    }
  }
  return rows;
}

export function BenchmarkTrendChart({ trends }: BenchmarkTrendChartProps) {
  if (!trends || trends.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No trend data"
        description="Pass rate trends will appear once multi-term data is available."
      />
    );
  }

  const data = buildChartData(trends);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No trend data"
        description="No term entries found in the provided data."
      />
    );
  }

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            width={40}
          />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toFixed(1)}%`,
              name === 'passRate' ? 'Actual Pass Rate' : 'Target Pass Rate',
            ]}
          />
          <Legend
            formatter={(value) =>
              value === 'passRate' ? 'Actual Pass Rate' : 'Target Pass Rate'
            }
          />
          <Line
            type="monotone"
            dataKey="passRate"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="passRate"
          />
          <Line
            type="monotone"
            dataKey="targetPassRate"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="targetPassRate"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
