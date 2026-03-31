'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { DebtorReportEntry } from '@/hooks/useReports';

interface DebtorsTableProps {
  data: DebtorReportEntry[];
}

const BUCKET_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  '0-30': 'secondary',
  '31-60': 'outline',
  '61-90': 'default',
  '90+': 'destructive',
};

function getStudentName(entry: DebtorReportEntry): string {
  const firstName = entry.studentId?.userId?.firstName ?? '';
  const lastName = entry.studentId?.userId?.lastName ?? '';
  const full = `${firstName} ${lastName}`.trim();
  return full || entry.studentId?.admissionNumber || '-';
}

export function DebtorsTable({ data }: DebtorsTableProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No outstanding invoices found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="text-right">Age</TableHead>
            <TableHead>Bucket</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <TableRow key={d.invoiceId}>
              <TableCell className="font-medium">{getStudentName(d)}</TableCell>
              <TableCell className="text-muted-foreground">{d.invoiceNumber}</TableCell>
              <TableCell className="text-right">{formatCurrency(d.totalAmount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(d.paidAmount)}</TableCell>
              <TableCell className="text-right font-semibold text-red-600">
                {formatCurrency(d.outstanding)}
              </TableCell>
              <TableCell className="text-right">{d.ageDays}d</TableCell>
              <TableCell>
                <Badge variant={BUCKET_VARIANT[d.bucket] ?? 'secondary'}>
                  {d.bucket}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
