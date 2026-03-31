'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import type { Invoice } from '@/types';

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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      if (!schoolId) return;
      try {
        const params: Record<string, string> = {};
        if (studentId) params.studentId = studentId;
        const response = await apiClient.get(`/fees/invoices/school/${schoolId}`, { params });
        const raw = response.data.data ?? response.data;
        const list: Invoice[] = Array.isArray(raw) ? raw : raw.invoices ?? raw.data ?? [];
        setInvoices(list);
      } catch {
        console.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    fetchInvoices();
  }, [schoolId, studentId]);

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
