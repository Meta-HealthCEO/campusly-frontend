'use client';

import { useState, useRef } from 'react';
import { Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CSVPreviewTable } from './CSVPreviewTable';
import type { BulkImportValidationResult, BulkImportResult } from '@/types';

interface BulkImportDialogProps {
  onDownloadTemplate: () => Promise<void>;
  onValidate: (file: File) => Promise<BulkImportValidationResult | null>;
  onImport: (file: File) => Promise<BulkImportResult | null>;
  validating: boolean;
  importing: boolean;
  onSuccess?: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'results';

export function BulkImportDialog({
  onDownloadTemplate,
  onValidate,
  onImport,
  validating,
  importing,
  onSuccess,
}: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<BulkImportValidationResult | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setValidation(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetState();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const res = await onValidate(f);
    if (res) {
      setValidation(res);
      setStep('preview');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.name.endsWith('.csv')) return;
    setFile(f);
    const res = await onValidate(f);
    if (res) {
      setValidation(res);
      setStep('preview');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStep('importing');
    const res = await onImport(file);
    if (res) {
      setResult(res);
      setStep('results');
      onSuccess?.();
    } else {
      setStep('preview');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      } />
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple students at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {step === 'upload' && (
            <UploadStep
              fileRef={fileRef}
              validating={validating}
              onFileSelect={handleFileSelect}
              onDrop={handleDrop}
              onDownloadTemplate={onDownloadTemplate}
            />
          )}

          {step === 'preview' && validation && (
            <PreviewStep validation={validation} />
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Importing students...</p>
            </div>
          )}

          {step === 'results' && result && (
            <ResultsStep result={result} />
          )}
        </div>

        <DialogFooter>
          {step === 'preview' && validation && validation.valid.length > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              Import {validation.valid.length} Students
            </Button>
          )}
          {step === 'preview' && (
            <Button variant="outline" onClick={resetState}>Start Over</Button>
          )}
          {step === 'results' && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function UploadStep({
  fileRef,
  validating,
  onFileSelect,
  onDrop,
  onDownloadTemplate,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  validating: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onDownloadTemplate: () => Promise<void>;
}) {
  return (
    <>
      <Button variant="link" className="p-0 h-auto" onClick={onDownloadTemplate}>
        <Download className="mr-1 h-4 w-4" />
        Download CSV Template
      </Button>
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          {validating ? 'Validating...' : 'Drag & drop a CSV file here, or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Maximum file size: 2MB</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onFileSelect}
      />
    </>
  );
}

function PreviewStep({ validation }: { validation: BulkImportValidationResult }) {
  return (
    <>
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>{validation.valid.length} valid rows</span>
        </div>
        {validation.errors.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive">{validation.errors.length} errors</span>
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          Total: {validation.totalRows} rows
        </div>
      </div>
      <CSVPreviewTable rows={validation.valid} errors={validation.errors} />
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">Errors:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
            {validation.errors.slice(0, 20).map((err, i) => (
              <li key={i}>Row {err.row}: {err.field} - {err.message}</li>
            ))}
            {validation.errors.length > 20 && (
              <li>...and {validation.errors.length - 20} more errors</li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}

function ResultsStep({ result }: { result: BulkImportResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        <span className="text-lg font-medium">Import Complete</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{result.imported}</p>
          <p className="text-xs text-muted-foreground">Imported</p>
        </div>
        <div className="rounded-md border p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
          <p className="text-xs text-muted-foreground">Skipped</p>
        </div>
        <div className="rounded-md border p-3 text-center">
          <p className="text-2xl font-bold">{result.totalRows}</p>
          <p className="text-xs text-muted-foreground">Total Rows</p>
        </div>
      </div>
      {result.errors.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">Import Errors:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
