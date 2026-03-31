'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Play, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useMigrationStore } from '@/stores/useMigrationStore';
import { ImportProgress } from './ImportProgress';
import { ImportResultsPanel } from './ImportResultsPanel';
import { SOURCE_SYSTEM_LABELS } from '@/types/migration';

interface ImportExecuteProps {
  jobId: string;
  onBack: () => void;
  onNewImport: () => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MINUTES = 10;

export function ImportExecute({ jobId, onBack, onNewImport }: ImportExecuteProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { activeJob, activeJobLoading, executeImport, pollStatus } = useMigrationStore();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollStartRef.current = Date.now();
    pollingRef.current = setInterval(async () => {
      const elapsed = Date.now() - pollStartRef.current;
      if (elapsed > MAX_POLL_MINUTES * 60 * 1000) {
        stopPolling();
        toast.error('Import is taking too long. Check the history tab for results.');
        return;
      }
      try {
        const job = await pollStatus(jobId);
        if (job.status === 'completed' || job.status === 'failed') {
          stopPolling();
        }
      } catch {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }, [jobId, pollStatus, stopPolling]);

  useEffect(() => {
    if (activeJob?.status === 'importing') {
      startPolling();
    }
    return stopPolling;
  }, [activeJob?.status, startPolling, stopPolling]);

  const handleExecute = async () => {
    setConfirmOpen(false);
    try {
      const job = await executeImport(jobId);
      if (job.status === 'importing') {
        startPolling();
      } else if (job.status === 'completed') {
        toast.success('Import completed successfully!');
      }
    } catch {
      toast.error('Failed to start import');
    }
  };

  const isImporting = activeJob?.status === 'importing';
  const isCompleted = activeJob?.status === 'completed';
  const isFailed = activeJob?.status === 'failed';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isCompleted && <CheckCircle className="h-5 w-5 text-emerald-600" />}
            {isFailed && <XCircle className="h-5 w-5 text-destructive" />}
            {!isCompleted && !isFailed && <Play className="h-5 w-5" />}
            {isCompleted ? 'Import Complete' : isFailed ? 'Import Failed' : 'Execute Import'}
          </CardTitle>
          <CardDescription>
            {isCompleted
              ? 'Your data has been imported successfully.'
              : isFailed
                ? 'The import encountered an error.'
                : 'Review the summary and start the import.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isImporting && (
            <ImportProgress fileName={activeJob?.uploadedFile.originalName ?? 'file'} />
          )}

          {isCompleted && activeJob?.importResults && (
            <ImportResultsPanel results={activeJob.importResults} />
          )}

          {isFailed && (
            <div className="flex flex-col items-center gap-2 py-8">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-muted-foreground">
                The import failed. Please check your data and try again.
              </p>
            </div>
          )}

          {!isImporting && !isCompleted && !isFailed && activeJob && (
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="text-sm font-medium">Import Summary</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source System</span>
                  <span>{SOURCE_SYSTEM_LABELS[activeJob.sourceSystem]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File</span>
                  <span>{activeJob.uploadedFile.originalName}</span>
                </div>
                {activeJob.validationResults && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Rows</span>
                      <span>{activeJob.validationResults.totalRows.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid Rows</span>
                      <span className="text-emerald-600">
                        {activeJob.validationResults.validRows.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Will Be Skipped</span>
                      <span>{activeJob.validationResults.duplicates.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mapped Fields</span>
                  <span>{Object.keys(activeJob.mapping).length}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {!isImporting && (
              <Button variant="outline" onClick={isCompleted || isFailed ? onNewImport : onBack}>
                {isCompleted || isFailed ? (
                  'New Import'
                ) : (
                  <>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </>
                )}
              </Button>
            )}
            {!isImporting && !isCompleted && !isFailed && (
              <Button onClick={() => setConfirmOpen(true)} disabled={activeJobLoading}>
                {activeJobLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}{' '}
                Start Import
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              This will create student, parent, staff, and grade records based on your mapped data.
              This action cannot be undone. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecute}>
              Confirm Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
