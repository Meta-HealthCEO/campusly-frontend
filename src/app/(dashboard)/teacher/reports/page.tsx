'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Printer } from 'lucide-react';
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
  } = useTeacherReportData();

  const [selectedStudent, setSelectedStudent] = useState('');
  const [term, setTerm] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!selectedStudent) {
      toast.error('Please select a student.');
      return;
    }
    if (!term || !academicYear) {
      toast.error('Please select term and academic year.');
      return;
    }
    setHasSearched(true);
    const result = await fetchStudentReportCard(selectedStudent, term, academicYear);
    setReportCard(result);
  }, [fetchStudentReportCard, selectedStudent, term, academicYear]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate student report cards" />

      <Card>
        <CardHeader>
          <CardTitle>Report Card Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class</label>
              <Select
                value={selectedClass || undefined}
                onValueChange={(v: unknown) => {
                  setSelectedClass(v as string);
                  setSelectedStudent('');
                  setReportCard(null);
                  setHasSearched(false);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Student</label>
              <Select
                value={selectedStudent || undefined}
                onValueChange={(v: unknown) => {
                  setSelectedStudent(v as string);
                  setReportCard(null);
                  setHasSearched(false);
                }}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder={loadingStudents ? 'Loading...' : 'Select student'} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Term</label>
              <Select value={term || undefined} onValueChange={(v: unknown) => setTerm(v as string)}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                className="w-24"
              />
            </div>

            <Button size="sm" onClick={handleGenerate} disabled={loading}>
              Generate
            </Button>

            {reportCard && reportCard.marks.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" />
                Print
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && hasSearched && reportCard && (
        <Card>
          <CardHeader>
            <CardTitle>
              Term {reportCard.term} — {reportCard.academicYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCardTable
              marks={reportCard.marks}
              term={reportCard.term}
              academicYear={reportCard.academicYear}
            />
          </CardContent>
        </Card>
      )}

      {!loading && hasSearched && !reportCard && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No report card data found. Please verify the student and try again.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
