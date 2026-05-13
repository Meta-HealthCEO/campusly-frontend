'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Printer } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ReportCardTable } from '@/components/reports/ReportCardTable';
import { useReports } from '@/hooks/useReports';
import { useTeacherReportData } from '@/hooks/useTeacherReports';
import type { ReportCardData } from '@/hooks/useReports';

const TERMS = [
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
  { value: '4', label: 'Term 4' },
];

export default function TeacherReportsPage() {
  const { loading, fetchStudentReportCard } = useReports();
  const {
    classes,
    students,
    selectedClass,
    setSelectedClass,
    loadingStudents,
    loadingClasses,
  } = useTeacherReportData();

  const [selectedStudent, setSelectedStudent] = useState('');
  const [term, setTerm] = useState('');
  const [academicYear, setAcademicYear] = useState(() => String(new Date().getFullYear()));
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedStudentOption = students.find((student) => student.id === selectedStudent);
  const effectiveSelectedStudent = selectedStudentOption ? selectedStudent : '';
  const canGenerate = Boolean(effectiveSelectedStudent && term && academicYear && !loading && !loadingStudents);

  const handleGenerate = useCallback(async () => {
    if (!effectiveSelectedStudent) {
      toast.error('Please select a learner.');
      return;
    }
    if (!term || !academicYear) {
      toast.error('Please select term and academic year.');
      return;
    }
    setHasSearched(true);
    const result = await fetchStudentReportCard(effectiveSelectedStudent, term, academicYear);
    setReportCard(result);
  }, [fetchStudentReportCard, effectiveSelectedStudent, term, academicYear]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reporting" description="Generate class-scoped learner report cards." />

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Report Card Generator</CardTitle>
          <CardDescription>
            Pick one of your classes, then generate a term report for a learner in that class.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_.7fr_.8fr_auto_auto]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class</label>
              <Select
                value={selectedClass || ''}
                disabled={loadingClasses || classes.length === 0}
                onValueChange={(v: unknown) => {
                  setSelectedClass(v as string);
                  setSelectedStudent('');
                  setReportCard(null);
                  setHasSearched(false);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingClasses ? 'Loading classes...' : 'Select class'} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classInfo) => (
                    <SelectItem key={classInfo.id} value={classInfo.id}>
                      {classInfo.name} ({classInfo.studentCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Learner</label>
              <Select
                value={effectiveSelectedStudent || ''}
                disabled={!selectedClass || loadingStudents || students.length === 0}
                onValueChange={(v: unknown) => {
                  setSelectedStudent(v as string);
                  setReportCard(null);
                  setHasSearched(false);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingStudents ? 'Loading learners...' : 'Select learner'} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}{student.admissionNumber ? ` - ${student.admissionNumber}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Term</label>
              <Select value={term || ''} onValueChange={(v: unknown) => setTerm(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Input
                type="number"
                placeholder="2026"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                min={2020}
                max={2030}
                className="w-full"
              />
            </div>

            <Button size="sm" onClick={handleGenerate} disabled={!canGenerate}>
              <FileText className="mr-1 h-4 w-4" />
              Generate
            </Button>

            {reportCard && reportCard.marks.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" />
                Print
              </Button>
            )}
          </div>

          {!loadingClasses && classes.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              No classes are linked to your teacher profile yet.
            </p>
          )}
          {!loadingStudents && selectedClass && students.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              This class does not have learners linked yet.
            </p>
          )}
        </CardContent>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && hasSearched && reportCard && (
        <Card className="print-area">
          <CardHeader>
            <CardTitle>
              {reportCard.student?.name ?? selectedStudentOption?.name ?? 'Learner'} - Term {reportCard.term}, {reportCard.academicYear}
            </CardTitle>
            <CardDescription>
              {[
                reportCard.student?.gradeName,
                reportCard.student?.className,
                reportCard.student?.admissionNumber
                  ? `Admission ${reportCard.student.admissionNumber}`
                  : selectedStudentOption?.admissionNumber
                    ? `Admission ${selectedStudentOption.admissionNumber}`
                    : '',
                reportCard.summary ? `Overall ${reportCard.summary.overallAverage}%` : '',
              ].filter(Boolean).join(' | ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportCard.summary && (
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Subjects</p>
                  <p className="text-lg font-semibold">{reportCard.summary.subjectSummaries.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Assessments</p>
                  <p className="text-lg font-semibold">{reportCard.summary.totalAssessments}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Overall average</p>
                  <p className="text-lg font-semibold">{reportCard.summary.overallAverage}%</p>
                </div>
              </div>
            )}

            <ReportCardTable
              marks={reportCard.marks}
              term={reportCard.term}
              academicYear={reportCard.academicYear}
              subjectSummaries={reportCard.summary?.subjectSummaries}
            />
          </CardContent>
        </Card>
      )}

      {!loading && hasSearched && !reportCard && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No report card data found. Please verify the learner and try again.
          </CardContent>
        </Card>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
          }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
