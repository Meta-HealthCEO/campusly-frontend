'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => Promise<ImportResult>;
  title: string;
  description?: string;
}

export function CSVImportDialog({
  open,
  onOpenChange,
  onImport,
  title,
  description = 'Upload a CSV file to import data.',
}: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setImporting(false);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
  }

  async function handleImport() {
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    try {
      const importResult = await onImport(file);
      setResult(importResult);
      toast.success(
        `Imported ${importResult.imported} record(s)`,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Import failed';
      toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">
              CSV File <span className="text-destructive">*</span>
            </Label>
            <Input
              id="csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-xs text-muted-foreground truncate">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{result.imported}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Errors ({result.errors.length})
                  </p>
                  <div className="overflow-x-auto max-h-40 rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5 text-left font-medium">
                            Row
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium">
                            Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map(
                          (error: { row: number; reason: string }) => (
                            <tr key={error.row} className="border-t">
                              <td className="px-3 py-1.5">{error.row}</td>
                              <td className="px-3 py-1.5 truncate max-w-[200px]">
                                {error.reason}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importing}
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={importing || !file}
            >
              {importing ? (
                'Importing...'
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
