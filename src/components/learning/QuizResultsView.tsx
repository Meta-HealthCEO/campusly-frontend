'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import { useLearningStore } from '@/stores/useLearningStore';
import { useLearningApi } from '@/hooks/useLearningApi';
import type { QuizAttempt } from './types';

interface QuizResultsViewProps {
  quizId: string;
}

function getStudentName(studentId: QuizAttempt['studentId']): string {
  if (typeof studentId === 'string') return studentId;
  if (studentId && typeof studentId === 'object') {
    return (studentId as Record<string, unknown>).userId as string ?? studentId._id ?? '';
  }
  return '';
}

const resultColumns: ColumnDef<QuizAttempt>[] = [
  {
    id: 'student',
    header: 'Student',
    cell: ({ row }) => <span className="font-medium">{getStudentName(row.original.studentId)}</span>,
  },
  {
    id: 'score',
    header: 'Score',
    cell: ({ row }) => row.original.totalScore,
  },
  {
    id: 'percentage',
    header: 'Percentage',
    cell: ({ row }) => {
      const pct = row.original.percentage;
      return (
        <span className={`font-medium ${pct >= 50 ? 'text-emerald-600' : 'text-destructive'}`}>
          {pct}%
        </span>
      );
    },
  },
  {
    id: 'attempt',
    header: 'Attempt #',
    cell: ({ row }) => row.original.attempt,
  },
  {
    id: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.completedAt ?? row.original.startedAt),
  },
  {
    id: 'result',
    header: 'Result',
    cell: ({ row }) =>
      row.original.percentage >= 50 ? (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Passed
        </Badge>
      ) : (
        <Badge variant="secondary" className="bg-destructive/10 text-destructive">
          <XCircle className="mr-1 h-3 w-3" /> Failed
        </Badge>
      ),
  },
];

export function QuizResultsView({ quizId }: QuizResultsViewProps) {
  const { quizResults, quizResultsLoading } = useLearningStore();
  const { fetchQuizResults } = useLearningApi();

  useEffect(() => {
    fetchQuizResults(quizId);
  }, [quizId, fetchQuizResults]);

  if (quizResultsLoading) return <LoadingSpinner />;
  if (!quizResults) return <EmptyState title="No Results" description="No quiz results available." />;

  const { attempts, averageScore, submissionCount } = quizResults;
  const passCount = attempts.filter((a) => a.percentage >= 50).length;
  const passRate = submissionCount > 0 ? Math.round((passCount / submissionCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{submissionCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{passRate}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{averageScore}%</p></CardContent>
        </Card>
      </div>

      {attempts.length === 0 ? (
        <EmptyState title="No Attempts" description="No students have attempted this quiz yet." />
      ) : (
        <DataTable columns={resultColumns} data={attempts} searchKey="studentId" searchPlaceholder="Search attempts..." />
      )}
    </div>
  );
}
