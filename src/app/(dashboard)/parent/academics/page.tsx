'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  GraduationCap, TrendingUp, TrendingDown, Minus, BookOpen, ClipboardList,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useParentAcademics } from '@/hooks/useParentAcademics';
import type { StudentGrade, Homework } from '@/types';

const assessmentColumns: ColumnDef<StudentGrade, unknown>[] = [
  {
    accessorKey: 'assessment.name', header: 'Assessment',
    cell: ({ row }) => <span className="font-medium">{row.original.assessment?.name ?? '-'}</span>,
  },
  {
    accessorKey: 'assessment.subject.name', header: 'Subject',
    cell: ({ row }) => row.original.assessment?.subject?.name ?? '-',
  },
  {
    accessorKey: 'assessment.type', header: 'Type',
    cell: ({ row }) => {
      const type = row.original.assessment?.type ?? 'test';
      const styles: Record<string, string> = { test: 'bg-blue-100 text-blue-800', exam: 'bg-purple-100 text-purple-800', assignment: 'bg-amber-100 text-amber-800', project: 'bg-emerald-100 text-emerald-800', quiz: 'bg-gray-100 text-gray-800' };
      return <Badge variant="secondary" className={styles[type] ?? ''}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
    },
  },
  {
    accessorKey: 'marks', header: 'Marks',
    cell: ({ row }) => `${row.original.marks} / ${row.original.assessment?.totalMarks ?? 0}`,
  },
  {
    accessorKey: 'percentage', header: 'Percentage',
    cell: ({ row }) => {
      const pct = row.original.percentage;
      const color = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
      return <span className={`font-semibold ${color}`}>{pct}%</span>;
    },
  },
  {
    accessorKey: 'assessment.date', header: 'Date',
    cell: ({ row }) => row.original.assessment?.date ? formatDate(row.original.assessment.date) : '-',
  },
];

const homeworkColumns: ColumnDef<Homework, unknown>[] = [
  { accessorKey: 'title', header: 'Title', cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  { accessorKey: 'subjectName', header: 'Subject', cell: ({ row }) => row.original.subject?.name ?? row.original.subjectName ?? '-' },
  { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => formatDate(row.original.dueDate) },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const styles: Record<string, string> = { published: 'bg-blue-100 text-blue-800', closed: 'bg-gray-100 text-gray-800', draft: 'bg-amber-100 text-amber-800' };
      return <Badge variant="secondary" className={styles[status] ?? ''}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
    },
  },
];

interface SubjectSummary {
  name: string;
  grades: number[];
  latestGrade: number;
  average: number;
  trend: number;
}

function buildSubjectSummary(marks: StudentGrade[]): SubjectSummary[] {
  const subjectMap = new Map<string, { name: string; grades: number[]; latestGrade: number }>();
  marks.forEach((g) => {
    const subjectName = g.assessment?.subject?.name ?? 'Unknown';
    const existing = subjectMap.get(subjectName);
    if (existing) {
      existing.grades.push(g.percentage);
      existing.latestGrade = g.percentage;
    } else {
      subjectMap.set(subjectName, { name: subjectName, grades: [g.percentage], latestGrade: g.percentage });
    }
  });
  return Array.from(subjectMap.values()).map((subject) => {
    const avg = Math.round(subject.grades.reduce((s, g) => s + g, 0) / subject.grades.length);
    const trend = subject.grades.length >= 2 ? subject.grades[subject.grades.length - 1] - subject.grades[subject.grades.length - 2] : 0;
    return { ...subject, average: avg, trend };
  });
}

export default function AcademicsPage() {
  const { children } = useCurrentParent();
  const { childData, loading } = useParentAcademics();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Academic Overview" description="Track your children's academic performance, grades, and homework." />

      <Tabs defaultValue={children[0]?.id ?? ''}>
        <TabsList>
          {childData.map((cd) => (
            <TabsTrigger key={cd.childId} value={cd.childId}>
              {cd.firstName} {cd.lastName}
            </TabsTrigger>
          ))}
        </TabsList>

        {childData.map((cd) => {
          const subjectSummary = buildSubjectSummary(cd.marks);
          const overallAvg = cd.marks.length > 0
            ? Math.round(cd.marks.reduce((s, g) => s + g.percentage, 0) / cd.marks.length)
            : 0;

          return (
            <TabsContent key={cd.childId} value={cd.childId} className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-primary/10 p-3"><GraduationCap className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Average - {cd.firstName}</p>
                      <p className="text-3xl font-bold">{overallAvg}%</p>
                      <p className="text-sm text-muted-foreground">{cd.gradeName} - {cd.className}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h3 className="text-base font-semibold mb-3">Subject Performance</h3>
                {subjectSummary.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {subjectSummary.map((subject) => (
                      <Card key={subject.name}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{subject.name}</p>
                            {subject.trend > 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : subject.trend < 0 ? <TrendingDown className="h-4 w-4 text-red-600" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <p className={`text-2xl font-bold ${subject.average >= 75 ? 'text-emerald-600' : subject.average >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{subject.average}%</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">Latest: {subject.latestGrade}%</p>
                            {subject.trend !== 0 && <p className={`text-xs font-medium ${subject.trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{subject.trend > 0 ? '+' : ''}{subject.trend}%</p>}
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                            <div className={`h-1.5 rounded-full ${subject.average >= 75 ? 'bg-emerald-500' : subject.average >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${subject.average}%` }} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={GraduationCap} title="No grades yet" description="Grades will appear here once assessments are completed." />
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assessment Results</CardTitle>
                  <CardDescription>Detailed results for all assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  {cd.marks.length > 0 ? (
                    <DataTable columns={assessmentColumns} data={cd.marks} searchKey="assessment_name" />
                  ) : (
                    <EmptyState icon={ClipboardList} title="No assessments" description="No assessment results available yet." />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Homework</CardTitle>
                  <CardDescription>Current and recent homework assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  {cd.homework.length > 0 ? (
                    <DataTable columns={homeworkColumns} data={cd.homework} searchKey="title" searchPlaceholder="Search homework..." />
                  ) : (
                    <EmptyState icon={BookOpen} title="No homework" description="No homework has been assigned yet." />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
