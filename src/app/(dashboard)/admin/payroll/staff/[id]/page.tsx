'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePayrollSalaries } from '@/hooks/usePayrollSalaries';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SalaryRecord, SalaryHistoryEntry } from '@/types';

export default function StaffSalaryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { fetchSalary, fetchHistory } = usePayrollSalaries();
  const [salary, setSalary] = useState<SalaryRecord | null>(null);
  const [history, setHistory] = useState<SalaryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, h] = await Promise.all([fetchSalary(id), fetchHistory(id)]);
        setSalary(s);
        setHistory(h);
      } catch (err: unknown) {
        console.error('Failed to load salary detail', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, fetchSalary, fetchHistory]);

  if (loading) return <LoadingSpinner />;
  if (!salary) return <div className="p-8 text-center text-muted-foreground">Salary record not found.</div>;

  const staffName = `${salary.staffId.firstName} ${salary.staffId.lastName}`;
  const grossPay = salary.basicSalary + salary.allowances.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={staffName} description={`Salary record — ${salary.department ?? 'No department'}`} />

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Basic Salary</p>
          <p className="text-xl font-bold">{formatCurrency(salary.basicSalary)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Gross Pay</p>
          <p className="text-xl font-bold">{formatCurrency(grossPay)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant={salary.isActive ? 'default' : 'secondary'} className="mt-1">
            {salary.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Start Date</p>
          <p className="text-xl font-bold">{formatDate(salary.startDate)}</p>
        </CardContent></Card>
      </div>

      {/* Allowances */}
      {salary.allowances.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Allowances</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {salary.allowances.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{a.name} {a.taxable && <Badge variant="outline" className="ml-1 text-xs">Taxable</Badge>}</span>
                  <span className="font-medium">{formatCurrency(a.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deductions */}
      {salary.deductions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Deductions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {salary.deductions.map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{d.name} {d.preTax && <Badge variant="outline" className="ml-1 text-xs">Pre-tax</Badge>}</span>
                  <span className="font-medium">{formatCurrency(d.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bank Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-muted-foreground">Bank</p><p className="font-medium">{salary.bankDetails.bankName}</p></div>
            <div><p className="text-muted-foreground">Account</p><p className="font-medium">{salary.bankDetails.accountNumber}</p></div>
            <div><p className="text-muted-foreground">Branch</p><p className="font-medium">{salary.bankDetails.branchCode}</p></div>
            <div><p className="text-muted-foreground">Type</p><p className="font-medium capitalize">{salary.bankDetails.accountType}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Salary History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Salary History</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm border-b pb-2">
                  <span className="text-muted-foreground whitespace-nowrap">{formatDate(h.changedAt)}</span>
                  <span className="font-medium">{h.field}</span>
                  <span className="text-muted-foreground">
                    {String(h.previousValue)} → {String(h.newValue)}
                  </span>
                  {h.reason && <span className="italic text-muted-foreground">({h.reason})</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
