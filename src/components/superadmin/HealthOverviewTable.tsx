'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { TenantHealthBadge } from './TenantHealthBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface HealthRow {
  tenantId: string;
  schoolId: string;
  schoolName: string;
  status: string;
  score: number;
  risk: 'healthy' | 'at_risk' | 'critical';
  tier: string;
}

interface HealthOverviewTableProps {
  fetchHealthOverview: () => Promise<HealthRow[]>;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function HealthOverviewTable({ fetchHealthOverview }: HealthOverviewTableProps) {
  const [rows, setRows] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchHealthOverview();
    setRows(data);
    setLoading(false);
  }, [fetchHealthOverview]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No tenant health data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Health Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.tenantId}>
                  <TableCell className="font-medium truncate max-w-48">
                    {row.schoolName}
                  </TableCell>
                  <TableCell>{capitalize(row.tier)}</TableCell>
                  <TableCell>{capitalize(row.status)}</TableCell>
                  <TableCell className="text-center">{row.score}</TableCell>
                  <TableCell>
                    <TenantHealthBadge risk={row.risk} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
