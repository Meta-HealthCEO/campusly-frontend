'use client';

import { useMemo } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, XCircle, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ConferenceReport } from '@/types';

interface ConferenceReportPanelProps {
  report: ConferenceReport;
}

export function ConferenceReportPanel({ report }: ConferenceReportPanelProps) {
  const utilizationData = useMemo(
    () =>
      report.teacherUtilization.map((t) => ({
        name: t.teacherName.length > 15 ? `${t.teacherName.slice(0, 15)}...` : t.teacherName,
        utilization: t.utilizationRate,
      })),
    [report.teacherUtilization],
  );

  const hourlyData = useMemo(
    () => report.bookingsByHour.map((h) => ({ hour: h.hour, count: h.count })),
    [report.bookingsByHour],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Booking Rate"
          value={`${report.bookingRate.toFixed(1)}%`}
          icon={BarChart3}
          description={`${report.bookedSlots} / ${report.totalSlots} slots`}
        />
        <StatCard
          title="No-Show Rate"
          value={`${report.noShowRate.toFixed(1)}%`}
          icon={XCircle}
          description={`${report.noShows} no-shows`}
        />
        <StatCard
          title="Teachers"
          value={`${report.teachersWithAvailability} / ${report.totalTeachers}`}
          icon={Users}
          description="Set availability"
        />
        <StatCard
          title="Avg Bookings"
          value={report.averageBookingsPerParent.toFixed(1)}
          icon={Calendar}
          description="Per parent"
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {utilizationData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 text-sm">Teacher Utilization (%)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilizationData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="utilization" fill="var(--color-primary, #2563eb)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {hourlyData.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 text-sm">Bookings by Hour</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-primary, #2563eb)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
