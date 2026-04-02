'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { TermAcademicYearFilter } from '@/components/reports/TermAcademicYearFilter';
import { PrintableReportCard } from '@/components/reports/PrintableReportCard';
import { useReports } from '@/hooks/useReports';
import type { ReportCardData } from '@/hooks/useReports';

export default function ParentReportCardPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const { loading, fetchStudentReportCard } = useReports();
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [term, setTerm] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const loadReport = useCallback(async () => {
    if (!term || !academicYear) {
      toast.error('Please select both term and academic year.');
      return;
    }
    setHasSearched(true);
    const result = await fetchStudentReportCard(studentId, term, academicYear);
    setReportCard(result);
  }, [fetchStudentReportCard, studentId, term, academicYear]);

  const handleReset = () => {
    setTerm('');
    setAcademicYear('');
    setReportCard(null);
    setHasSearched(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Card"
        description="View and download your child's report card."
      >
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {reportCard && reportCard.marks.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-1 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Download className="mr-1 h-4 w-4" />
                Download PDF
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <TermAcademicYearFilter
          term={term}
          academicYear={academicYear}
          onTermChange={setTerm}
          onAcademicYearChange={setAcademicYear}
          onReset={handleReset}
        />
        <Button size="sm" onClick={loadReport} disabled={loading}>
          Generate Report
        </Button>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && hasSearched && reportCard && (
        <div className="print-area">
          <PrintableReportCard
            marks={reportCard.marks}
            term={reportCard.term}
            academicYear={reportCard.academicYear}
          />
        </div>
      )}

      {!loading && hasSearched && !reportCard && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Failed to load report card. Please try again.
          </CardContent>
        </Card>
      )}

      {!loading && !hasSearched && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select a term and academic year, then click &quot;Generate Report&quot; to view the report card.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
