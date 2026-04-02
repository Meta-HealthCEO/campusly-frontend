'use client';

import { useMemo } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { BulkImportRowError } from '@/types';

interface CSVPreviewTableProps {
  rows: Record<string, string>[];
  errors: BulkImportRowError[];
  maxRows?: number;
}

export function CSVPreviewTable({ rows, errors, maxRows = 10 }: CSVPreviewTableProps) {
  const displayRows = rows.slice(0, maxRows);
  const headers = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const errorsByRow = useMemo(() => {
    const map = new Map<number, BulkImportRowError[]>();
    for (const err of errors) {
      const existing = map.get(err.row) ?? [];
      existing.push(err);
      map.set(err.row, existing);
    }
    return map;
  }, [errors]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data rows found in CSV.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="w-10">Status</TableHead>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, idx) => {
            const rowNum = idx + 2; // 1-indexed + header
            const rowErrors = errorsByRow.get(rowNum);
            const hasError = !!rowErrors && rowErrors.length > 0;

            return (
              <TableRow key={idx} className={hasError ? 'bg-destructive/5' : ''}>
                <TableCell className="text-xs text-muted-foreground">{rowNum}</TableCell>
                <TableCell>
                  {hasError ? (
                    <span title={rowErrors.map((e) => `${e.field}: ${e.message}`).join('; ')}>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </TableCell>
                {headers.map((h) => (
                  <TableCell key={h} className="text-sm truncate max-w-[150px]">
                    {row[h] || '-'}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length > maxRows && (
        <p className="text-xs text-muted-foreground p-2">
          Showing {maxRows} of {rows.length} rows
        </p>
      )}
    </div>
  );
}
