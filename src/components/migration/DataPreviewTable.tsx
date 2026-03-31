'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useMigrationStore } from '@/stores/useMigrationStore';

interface DataPreviewTableProps {
  jobId: string;
  onBack: () => void;
  onContinue: () => void;
}

export function DataPreviewTable({ jobId, onBack, onContinue }: DataPreviewTableProps) {
  const { preview, previewLoading, getPreview } = useMigrationStore();

  useEffect(() => {
    getPreview(jobId);
  }, [jobId, getPreview]);

  const columns = preview?.sampleRows?.[0]
    ? Object.keys(preview.sampleRows[0])
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" /> Data Preview
        </CardTitle>
        <CardDescription>
          Review up to 10 sample rows of your mapped data before importing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewLoading ? (
          <LoadingSpinner />
        ) : !preview || columns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No preview data available. Check that your mapping is configured.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sampleRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col} className="text-xs">
                        {row[col] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {preview?.sampleRows && (
          <p className="text-xs text-muted-foreground">
            Showing {preview.sampleRows.length} sample row(s)
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={onContinue} disabled={!preview || columns.length === 0}>
            Continue to Import <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
