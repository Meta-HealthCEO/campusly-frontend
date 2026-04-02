'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useInvoicesList } from '@/hooks/useFeeDialogData';

interface InvoiceSelectorProps {
  schoolId: string;
  studentId?: string;
  value: string;
  onValueChange: (invoiceId: string) => void;
  label?: string;
}

export function InvoiceSelector({
  schoolId,
  studentId,
  value,
  onValueChange,
  label = 'Invoice',
}: InvoiceSelectorProps) {
  const { invoices, loading } = useInvoicesList(schoolId, studentId);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(val: unknown) => onValueChange(val as string)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select an invoice...'} />
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
  );
}
