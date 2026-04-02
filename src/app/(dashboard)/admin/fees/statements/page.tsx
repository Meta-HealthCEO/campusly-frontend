'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LedgerTable } from '@/components/fees/LedgerTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  useStatementStudents,
  generateStatement,
} from '@/hooks/useStatements';
import type { StatementData } from '@/hooks/useStatements';
import type { Student } from '@/types';

export default function StatementsPage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  return (
    <div className="space-y-6">
      <PageHeader title="Statements & Ledger" description="Generate account statements and view student ledgers" />
      <Tabs defaultValue="statements">
        <TabsList>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="ledger">Account Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="statements" className="mt-4">
          <StatementsTab schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <LedgerTable schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatementsTab({ schoolId }: { schoolId: string }) {
  const { students, loading: loadingStudents } = useStatementStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [generating, setGenerating] = useState(false);

  const selectedStudent = students.find((s) => (s.id ?? s._id) === selectedStudentId);

  const handleGenerate = async () => {
    if (!selectedStudentId || !schoolId) return;
    setGenerating(true);
    setStatement(null);
    const result = await generateStatement(
      selectedStudentId,
      schoolId,
      fromDate || undefined,
      toDate || undefined,
    );
    if (result) {
      setStatement(result);
    }
    setGenerating(false);
  };

  const studentDisplayName = (s: Student) => {
    if (s.user) return `${s.user.firstName} ${s.user.lastName}`;
    if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
    return s.admissionNumber ?? 'Unknown';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Select Student</Label>
              <Select onValueChange={(val: unknown) => {
                setSelectedStudentId(val as string);
                setStatement(null);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingStudents ? 'Loading...' : 'Choose a student...'} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id ?? s._id} value={s.id ?? s._id ?? ''}>
                      {studentDisplayName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromDate">From</Label>
              <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To</Label>
              <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button onClick={handleGenerate} disabled={!selectedStudentId || generating}>
              <FileText className="mr-2 h-4 w-4" />
              {generating ? 'Generating...' : 'Generate Statement'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {statement && selectedStudent ? (
        <StatementView studentName={studentDisplayName(selectedStudent)} statement={statement} />
      ) : !statement ? (
        <EmptyState
          icon={FileText}
          title="No statement generated"
          description="Select a student and click Generate Statement to view their account summary."
        />
      ) : null}
    </div>
  );
}

function StatementView({ studentName, statement }: { studentName: string; statement: StatementData }) {
  const { summary, invoices, payments } = statement;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Statement - {studentName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Invoiced', value: summary.totalInvoiced },
            { label: 'Total Paid', value: summary.totalPaid, className: 'text-emerald-600' },
            { label: 'Credits', value: summary.totalCredits },
            { label: 'Outstanding', value: summary.outstanding, className: 'text-destructive' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-xl font-bold ${item.className ?? ''}`}>
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}
        </div>
        <Separator />
        <div>
          <h3 className="mb-3 font-semibold">Invoices</h3>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices found for this period.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv, idx) => (
                <div key={inv.id || inv.invoiceNumber || idx}
                  className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{inv.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">Due: {formatDate(inv.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(inv.totalAmount)}</p>
                    <p className="text-sm text-emerald-600">Paid: {formatCurrency(inv.paidAmount)}</p>
                    {inv.balanceDue > 0 && (
                      <p className="text-sm text-destructive">Balance: {formatCurrency(inv.balanceDue)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {payments.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="mb-3 font-semibold">Payments</h3>
              <div className="space-y-2">
                {payments.map((p, idx) => (
                  <div key={p.id || p.reference || idx}
                    className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{p.reference || '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(p.date)} &middot; {p.method.toUpperCase()}
                      </p>
                    </div>
                    <p className="font-medium text-emerald-600">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
