'use client';

import {
  LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar,
  PieChart as RechartsPieChart, Pie, Cell, AreaChart as RechartsAreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useChartTheme } from '@/hooks/useChartTheme';
import { seriesColour, type ChartTheme } from '@/lib/charts/chart-theme';

interface ChartProps {
  data: Record<string, unknown>[];
  height?: number;
}

interface LineChartProps extends ChartProps {
  xKey: string;
  lines: { key: string; color?: string; name?: string }[];
}

function NoDataMessage({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
      No data available
    </div>
  );
}

/** Axis ticks, grid and tooltip from the chart theme (spec §4): no chart sets its own colours. */
const tick = (theme: ChartTheme) => ({ fill: theme.axis, fontSize: 12, fontFamily: theme.fontFamily });
const tooltipStyle = (theme: ChartTheme) => ({
  borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text,
});

export function LineChartComponent({ data, xKey, lines, height = 300 }: LineChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return <NoDataMessage height={height} />;
  if (!theme) return <Skeleton style={{ height }} className="w-full" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey={xKey} tick={tick(theme)} />
        <YAxis tick={tick(theme)} />
        <Tooltip contentStyle={tooltipStyle(theme)} />
        <Legend />
        {lines.map((line, i) => (
          <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color ?? seriesColour(theme, i)} name={line.name || line.key} strokeWidth={2} dot={false} />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps extends ChartProps {
  xKey: string;
  bars: { key: string; color?: string; name?: string }[];
}

export function BarChartComponent({ data, xKey, bars, height = 300 }: BarChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return <NoDataMessage height={height} />;
  if (!theme) return <Skeleton style={{ height }} className="w-full" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey={xKey} tick={tick(theme)} />
        <YAxis tick={tick(theme)} />
        <Tooltip contentStyle={tooltipStyle(theme)} />
        <Legend />
        {bars.map((bar, i) => (
          <Bar key={bar.key} dataKey={bar.key} fill={bar.color ?? seriesColour(theme, i)} name={bar.name || bar.key} radius={[4, 4, 0, 0]} />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
}

export function PieChartComponent({ data, height = 300 }: PieChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return <NoDataMessage height={height} />;
  if (!theme) return <Skeleton style={{ height }} className="w-full" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.color ?? seriesColour(theme, i)} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle(theme)} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

interface AreaChartProps extends ChartProps {
  xKey: string;
  areas: { key: string; color?: string; name?: string }[];
}

export function AreaChartComponent({ data, xKey, areas, height = 300 }: AreaChartProps) {
  const theme = useChartTheme();
  if (data.length === 0) return <NoDataMessage height={height} />;
  if (!theme) return <Skeleton style={{ height }} className="w-full" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis dataKey={xKey} tick={tick(theme)} />
        <YAxis tick={tick(theme)} />
        <Tooltip contentStyle={tooltipStyle(theme)} />
        <Legend />
        {areas.map((area, i) => (
          <Area key={area.key} type="monotone" dataKey={area.key} stroke={area.color ?? seriesColour(theme, i)} fill={area.color ?? seriesColour(theme, i)} fillOpacity={0.1} name={area.name || area.key} />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
