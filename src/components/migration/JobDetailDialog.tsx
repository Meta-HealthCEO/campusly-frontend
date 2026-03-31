'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MigrationJob, PerformedByUser } from '@/types/migration';
import { SOURCE_SYSTEM_LABELS, STATUS_COLORS } from '@/types/migration';

interface JobDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: MigrationJob | null;
}

function getPerformedByName(performedBy: MigrationJob['performedBy']): string {
  if (typeof performedBy === 'string') return performedBy;
  const user = performedBy as PerformedByUser;
  return `${user.firstName} ${user.lastName}`;
}

export function JobDetailDialog({ open, onOpenChange, job }: JobDetailDialogProps) {
  if (!job) return null;

  const vr = job.validationResults;
  const ir = job.importResults;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Migration Job Details</DialogTitle>
          <DialogDescription>
            {job.uploadedFile.originalName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge className={STATUS_COLORS[job.status]}>{job.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source System</span>
              <span>{SOURCE_SYSTEM_LABELS[job.sourceSystem]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Performed By</span>
              <span>{getPerformedByName(job.performedBy)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(job.createdAt).toLocaleString()}</span>
            </div>
            {job.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span>{new Date(job.completedAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {vr && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Validation Results</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Total Rows:</span>{' '}
                  {vr.totalRows.toLocaleString()}
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Valid:</span>{' '}
                  {vr.validRows.toLocaleString()}
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Invalid:</span>{' '}
                  {vr.invalidRows.toLocaleString()}
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Duplicates:</span>{' '}
                  {vr.duplicates.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {ir && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Import Results</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Students:</span>{' '}
                  {ir.studentsCreated.toLocaleString()}
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Parents:</span>{' '}
                  {ir.parentsCreated.toLocaleString()}
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Staff:</span>{' '}
                  {ir.staffCreated.toLocaleString()}
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Grades:</span>{' '}
                  {ir.gradesCreated.toLocaleString()}
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <span className="text-muted-foreground">Skipped:</span>{' '}
                  {ir.skipped.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {((vr?.errors?.length ?? 0) > 0 || (ir?.errors?.length ?? 0) > 0) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Errors</h4>
              <div className="max-h-40 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...(vr?.errors ?? []), ...(ir?.errors ?? [])].map((err, i) => (
                      <TableRow key={`err-${i}`}>
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
        </div>

        <DialogFooter showCloseButton>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
