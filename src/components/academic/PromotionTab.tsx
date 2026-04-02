'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TrendingUp, Search } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useGrades } from '@/hooks/useAcademics';
import { usePromotionReport } from '@/hooks/useAcademicMutationsExtended';
import type { GradeReport } from '@/hooks/useAcademicMutationsExtended';

interface PromotionStudent {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  totalSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  overallAverage: number;
  promoted: boolean;
}

export function PromotionTab() {
  const { grades } = useGrades();
  const { fetchPromotionReport } = usePromotionReport();
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [year, setYear] = useState('2026');
  const [report, setReport] = useState<GradeReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!selectedGradeId || !year) {
      toast.error('Select a grade and year');
      return;
    }
    try {
      setLoading(true);
      const data = await fetchPromotionReport(selectedGradeId, Number(year));
      setReport(data);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load promotion report'));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [selectedGradeId, year, fetchPromotionReport]);

  const columns: ColumnDef<PromotionStudent>[] = [
    { accessorKey: 'admissionNumber', header: 'Adm No.' },
    {
      id: 'name',
      header: 'Student Name',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      id: 'average',
      header: 'Average',
      cell: ({ row }) => {
        const avg = row.original.overallAverage;
        const color = avg >= 80 ? 'text-emerald-600' : avg >= 60 ? 'text-blue-600' : avg >= 50 ? 'text-amber-600' : 'text-destructive';
        return <span className={`font-semibold ${color}`}>{Math.round(avg)}%</span>;
      },
    },
    {
      id: 'passed',
      header: 'Passed',
      accessorFn: (row) => `${row.passedSubjects}/${row.totalSubjects}`,
    },
    {
      id: 'failed',
      header: 'Failed',
      accessorFn: (row) => row.failedSubjects,
    },
    {
      id: 'promoted',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.promoted ? 'default' : 'destructive'}>
          {row.original.promoted ? 'Promoted' : 'Not Promoted'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>Grade</Label>
          <Select value={selectedGradeId} onValueChange={(v: unknown) => setSelectedGradeId(v as string)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Year</Label>
          <Input type="number" min={2000} value={year} onChange={(e) => setYear(e.target.value)} className="w-28" />
        </div>
        <Button onClick={fetchReport} disabled={!selectedGradeId || !year}>
          <Search className="mr-1 h-4 w-4" /> Generate Report
        </Button>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && !report && (
        <EmptyState
          icon={TrendingUp}
          title="Promotion Report"
          description="Select a grade and year, then click Generate Report."
        />
      )}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{report.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{report.promoted}</p>
                <p className="text-sm text-muted-foreground">Promoted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{report.notPromoted}</p>
                <p className="text-sm text-muted-foreground">Not Promoted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{Math.round(report.promotionRate)}%</p>
                <p className="text-sm text-muted-foreground">Promotion Rate</p>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={columns}
            data={report.students}
            searchKey="name"
            searchPlaceholder="Search students..."
          />
        </>
      )}
    </div>
  );
}
