'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReportCardTable } from '@/components/reports/ReportCardTable';
import { useReports, type ReportCardData } from '@/hooks/useReports';
import { useTeacherReportData } from '@/hooks/useTeacherReports';

const TERMS = ['1', '2', '3', '4'];

interface Props {
  /** The gradebook's class. */
  classId: string;
  /** The gradebook's term: '1' to '4', or 'year' (then the teacher picks a term here). */
  term: string;
}

/** A learner's term report card for the gradebook's class, printable. */
export function ReportCardPanel({ classId, term: gradebookTerm }: Props) {
  const { loading, fetchStudentReportCard } = useReports();
  const { students, loadingStudents } = useTeacherReportData(classId);
  const [studentId, setStudentId] = useState('');
  const [term, setTerm] = useState(TERMS.includes(gradebookTerm) ? gradebookTerm : '');
  const [academicYear, setAcademicYear] = useState(() => String(new Date().getFullYear()));
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const student = students.find((s) => s.id === studentId);
  const canGenerate = Boolean(student && term && academicYear && !loading);

  const generate = useCallback(async () => {
    if (!student || !term) {
      toast.error('Pick a learner and a term.');
      return;
    }
    setHasSearched(true);
    setReportCard(await fetchStudentReportCard(student.id, term, academicYear));
  }, [fetchStudentReportCard, student, term, academicYear]);

  const reset = (): void => {
    setReportCard(null);
    setHasSearched(false);
  };

  const summaryStats: Array<[string, string | number]> = reportCard?.summary
    ? [
      ['Subjects', reportCard.summary.subjectSummaries.length],
      ['Assessments', reportCard.summary.totalAssessments],
      ['Overall average', `${reportCard.summary.overallAverage}%`],
    ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid items-end gap-3 print:hidden sm:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.7fr_auto_auto]">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="report-learner">Learner</label>
          <Select
            value={studentId}
            disabled={loadingStudents || students.length === 0}
            onValueChange={(v: unknown) => { setStudentId(v as string); reset(); }}
          >
            <SelectTrigger id="report-learner" className="w-full">
              <SelectValue placeholder={loadingStudents ? 'Loading learners…' : 'Pick a learner'} />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}{s.admissionNumber ? ` · ${s.admissionNumber}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="report-term">Term</label>
          <Select value={term} onValueChange={(v: unknown) => { setTerm(v as string); reset(); }}>
            <SelectTrigger id="report-term" className="w-full"><SelectValue placeholder="Term" /></SelectTrigger>
            <SelectContent>
              {TERMS.map((t) => <SelectItem key={t} value={t}>Term {t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="report-year">Year</label>
          <Input
            id="report-year"
            type="number"
            min={2020}
            max={2035}
            value={academicYear}
            onChange={(e) => { setAcademicYear(e.target.value); reset(); }}
            className="w-full font-mono"
          />
        </div>
        <Button onClick={() => void generate()} disabled={!canGenerate} className="min-h-11 sm:min-h-9">
          <FileText className="mr-1 h-4 w-4" aria-hidden /> Show report card
        </Button>
        {reportCard && reportCard.marks.length > 0 ? (
          <Button variant="outline" onClick={() => window.print()} className="min-h-11 sm:min-h-9">
            <Printer className="mr-1 h-4 w-4" aria-hidden /> Print
          </Button>
        ) : null}
      </div>
      {!loadingStudents && students.length === 0 ? (
        <p className="text-sm text-muted-foreground">This class has no learners linked yet.</p>
      ) : null}

      {loading ? <LoadingSpinner /> : null}
      {!loading && hasSearched && reportCard ? (
        <Card className="print-area">
          <CardHeader>
            <CardTitle className="font-heading">
              {reportCard.student?.name ?? student?.name ?? 'Learner'} · Term {reportCard.term}, {reportCard.academicYear}
            </CardTitle>
            <CardDescription>
              {[
                reportCard.student?.gradeName,
                reportCard.student?.className,
                reportCard.student?.admissionNumber ? `Admission ${reportCard.student.admissionNumber}` : '',
              ].filter(Boolean).join(' · ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryStats.length > 0 ? (
              <dl className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {summaryStats.map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <ReportCardTable
              marks={reportCard.marks}
              term={reportCard.term}
              academicYear={reportCard.academicYear}
              subjectSummaries={reportCard.summary?.subjectSummaries}
            />
          </CardContent>
        </Card>
      ) : null}
      {!loading && hasSearched && !reportCard ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No marks for this learner in that term yet.</p>
      ) : null}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
