'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMigrationStore } from '@/stores/useMigrationStore';
import { useMigrationApi } from '@/hooks/useMigrationApi';

interface ValidationResultsProps {
  jobId: string;
  onBack: () => void;
}

export function ValidationResultsStep({ jobId, onBack }: ValidationResultsProps) {
  const { activeJob, activeJobLoading, setWizardStep } = useMigrationStore();
  const { validateJob } = useMigrationApi();
  const results = activeJob?.validationResults;
  const hasBlockingErrors = results?.errors?.some((e) => e.row === 0) ?? false;
  const hasResults = !!results;

  const handleValidate = async () => {
    try {
      await validateJob(jobId);
      toast.success('Validation completed');
    } catch {
      toast.error('Validation failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validate Data</CardTitle>
        <CardDescription>
          Run validation to check your data before importing. This will verify field mappings
          and validate data integrity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasResults && (
          <div className="flex flex-col items-center py-8">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">
              Click the button below to validate your data against the configured mapping.
            </p>
            <Button onClick={handleValidate} disabled={activeJobLoading}>
              {activeJobLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}{' '}
              Run Validation
            </Button>
          </div>
        )}

        {hasResults && results && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Rows"
                value={results.totalRows.toLocaleString()}
                icon={FileText}
              />
              <StatCard
                title="Valid Rows"
                value={results.validRows.toLocaleString()}
                icon={CheckCircle}
                className="border-emerald-200 dark:border-emerald-800"
              />
              <StatCard
                title="Invalid Rows"
                value={results.invalidRows.toLocaleString()}
                icon={XCircle}
                className={results.invalidRows > 0 ? 'border-red-200 dark:border-red-800' : ''}
              />
              <StatCard
                title="Duplicates"
                value={results.duplicates.toLocaleString()}
                icon={Copy}
                className={results.duplicates > 0 ? 'border-yellow-200 dark:border-yellow-800' : ''}
              />
            </div>

            {results.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Errors ({results.errors.length})
                </h4>
                <div className="max-h-48 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.errors.map((err, i) => (
                        <TableRow
                          key={`${err.row}-${err.field}-${i}`}
                          className={err.row === 0 ? 'bg-destructive/5' : ''}
                        >
                          <TableCell className="font-mono text-xs">
                            {err.row === 0 ? 'Config' : err.row}
                          </TableCell>
                          <TableCell className="text-xs">{err.field}</TableCell>
                          <TableCell className="text-xs">{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {hasBlockingErrors && (
              <p className="text-xs text-destructive">
                Configuration-level errors must be fixed before importing. Go back to adjust your
                field mapping.
              </p>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={activeJobLoading}
            >
              {activeJobLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}{' '}
              Re-run Validation
            </Button>
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back to Mapping
          </Button>
          {hasResults && !hasBlockingErrors && (
            <Button onClick={() => setWizardStep(5)}>
              Continue to Preview <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
