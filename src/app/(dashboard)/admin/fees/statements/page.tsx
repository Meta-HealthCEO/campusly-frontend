'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/shared/EmptyState';
import { mockParents, mockInvoices } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function StatementsPage() {
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [showStatement, setShowStatement] = useState(false);

  const selectedParent = mockParents.find((p) => p.id === selectedParentId);
  const parentInvoices = mockInvoices.filter((inv) => inv.parentId === selectedParentId);

  const totalInvoiced = parentInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = parentInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalOutstanding = parentInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  const handleGenerate = () => {
    if (selectedParentId) {
      setShowStatement(true);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Statements" description="Generate account statements for parents" />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Select Parent</label>
              <Select onValueChange={(val: unknown) => { setSelectedParentId(val as string); setShowStatement(false); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a parent..." />
                </SelectTrigger>
                <SelectContent>
                  {mockParents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.user.firstName} {parent.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={!selectedParentId}>
              <FileText className="mr-2 h-4 w-4" />
              Generate Statement
            </Button>
          </div>
        </CardContent>
      </Card>

      {showStatement && selectedParent ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Account Statement - {selectedParent.user.firstName} {selectedParent.user.lastName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Invoiced</p>
                <p className="mt-1 text-xl font-bold">{formatCurrency(totalInvoiced)}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="mt-1 text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="mt-1 text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 font-semibold">Transaction History</h3>
              {parentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions found for this parent.</p>
              ) : (
                <div className="space-y-2">
                  {parentInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Issued: {formatDate(inv.issuedDate)} | Due: {formatDate(inv.dueDate)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Student: {inv.student.user.firstName} {inv.student.user.lastName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(inv.totalAmount)}</p>
                        <p className="text-sm text-emerald-600">Paid: {formatCurrency(inv.paidAmount)}</p>
                        {inv.balanceDue > 0 && (
                          <p className="text-sm text-red-600">Balance: {formatCurrency(inv.balanceDue)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : !showStatement ? (
        <EmptyState
          icon={FileText}
          title="No statement generated"
          description="Select a parent and click Generate Statement to view their account summary."
        />
      ) : null}
    </div>
  );
}
