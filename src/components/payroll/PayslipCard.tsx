'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import type { Payslip, PayslipLine } from '@/types';

interface PayslipCardProps {
  payslip: Payslip;
}

function LineList({ lines }: { lines: PayslipLine[] }) {
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li key={i} className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground truncate">{line.description}</span>
          <span className="font-medium shrink-0">{formatCurrency(line.amount)}</span>
        </li>
      ))}
      {lines.length === 0 && (
        <li className="text-sm text-muted-foreground italic">None</li>
      )}
    </ul>
  );
}

export function PayslipCard({ payslip }: PayslipCardProps) {
  const {
    payslipNumber,
    staffName,
    department,
    payPeriod,
    earnings,
    deductions,
    grossPay,
    totalDeductions,
    netPay,
  } = payslip;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-lg truncate">{staffName}</h3>
            <p className="text-sm text-muted-foreground truncate">{department}</p>
          </div>
          <div className="text-sm text-right shrink-0">
            <p className="font-medium">{payslipNumber}</p>
            <p className="text-muted-foreground">{payPeriod}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Earnings */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Earnings
            </p>
            <LineList lines={earnings} />
          </div>

          {/* Deductions */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Deductions
            </p>
            <LineList lines={deductions} />
          </div>
        </div>

        <Separator />

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Gross Pay</p>
            <p className="font-semibold text-sm">{formatCurrency(grossPay)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Deductions</p>
            <p className="font-semibold text-sm text-destructive">
              -{formatCurrency(totalDeductions)}
            </p>
          </div>
          <div className="bg-primary/10 rounded-lg px-2 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Net Pay</p>
            <p className="font-bold text-sm text-primary">{formatCurrency(netPay)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
