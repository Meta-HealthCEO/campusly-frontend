'use client';

import { useState } from 'react';
import { ArrowUpCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useDebtorInvoices } from '@/hooks/useFeeDialogData';
import { EscalateDialog } from '@/components/fees/EscalateDialog';
import { WriteOffDialog } from '@/components/fees/WriteOffDialog';

interface DebtorActionsProps {
  studentName: string;
  studentId: string;
  schoolId: string;
  onSuccess: () => void;
}

export function DebtorActions({ studentName, studentId, schoolId, onSuccess }: DebtorActionsProps) {
  const [actionType, setActionType] = useState<'escalate' | 'write_off' | null>(null);
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const { invoices, loading: loadingInvoices } = useDebtorInvoices(
    schoolId,
    studentId,
    selectDialogOpen,
  );

  const openAction = (type: 'escalate' | 'write_off') => {
    setActionType(type);
    setSelectedInvoiceId('');
    setSelectDialogOpen(true);
  };

  const handleInvoiceSelected = () => {
    if (!selectedInvoiceId) return;
    setSelectDialogOpen(false);
  };

  return (
    <>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => openAction('escalate')} title="Escalate">
          <ArrowUpCircle className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => openAction('write_off')} title="Write Off">
          <XCircle className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={selectDialogOpen} onOpenChange={setSelectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Invoice</DialogTitle>
            <DialogDescription>
              Choose an invoice for {studentName} to {actionType === 'escalate' ? 'escalate' : 'write off'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Invoice</Label>
            <Select
              value={selectedInvoiceId}
              onValueChange={(val: unknown) => setSelectedInvoiceId(val as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingInvoices ? 'Loading...' : 'Select an invoice...'} />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv) => {
                  const id = inv.id ?? (inv as unknown as Record<string, string>)._id ?? '';
                  return (
                    <SelectItem key={id} value={id}>
                      {inv.invoiceNumber} - {formatCurrency(inv.balanceDue)} due
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInvoiceSelected} disabled={!selectedInvoiceId}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {actionType === 'escalate' && selectedInvoiceId && !selectDialogOpen && (
        <EscalateDialog
          open
          onOpenChange={(open) => { if (!open) setSelectedInvoiceId(''); }}
          invoiceId={selectedInvoiceId}
          studentName={studentName}
          onSuccess={onSuccess}
        />
      )}
      {actionType === 'write_off' && selectedInvoiceId && !selectDialogOpen && (
        <WriteOffDialog
          open
          onOpenChange={(open) => { if (!open) setSelectedInvoiceId(''); }}
          invoiceId={selectedInvoiceId}
          studentName={studentName}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
