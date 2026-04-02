'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';

export interface OverdueFineEntry {
  loanId: string;
  studentId: string;
  studentName: string;
  bookTitle: string;
  dueDate: string;
  daysOverdue: number;
  fineAmountCents: number;
  fineInvoiceId?: string;
}

export interface FineConfig {
  finePerDayCents: number;
  maxFineCents?: number;
  exemptGrades: string[];
}

export interface GenerateResult {
  generatedCount: number;
  totalAmountCents: number;
}

export function useLibraryFines() {
  const [fines, setFines] = useState<OverdueFineEntry[]>([]);
  const [finesLoading, setFinesLoading] = useState(false);
  const [config, setConfig] = useState<FineConfig>({ finePerDayCents: 200, exemptGrades: [] });
  const [configLoading, setConfigLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchFines = useCallback(async () => {
    setFinesLoading(true);
    try {
      const res = await apiClient.get('/library/fines');
      const raw = unwrapResponse(res);
      setFines(Array.isArray(raw) ? raw as OverdueFineEntry[] : []);
    } catch {
      console.error('Failed to fetch fines');
    } finally {
      setFinesLoading(false);
    }
  }, []);

  const generateInvoices = useCallback(async (): Promise<GenerateResult> => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/library/fines/generate-invoices', {});
      const raw = unwrapResponse(res) as GenerateResult;
      toast.success(`Generated ${raw.generatedCount} invoice(s)`);
      return raw;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to generate invoices';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setGenerating(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await apiClient.get('/library/fine-config');
      const raw = unwrapResponse(res) as FineConfig;
      setConfig(raw);
    } catch {
      console.error('Failed to fetch fine config');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (data: Partial<FineConfig>) => {
    try {
      const res = await apiClient.put('/library/fine-config', data);
      const raw = unwrapResponse(res) as FineConfig;
      setConfig(raw);
      toast.success('Fine configuration updated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update config';
      toast.error(msg);
    }
  }, []);

  const totalFineAmountCents = fines.reduce((sum, f) => sum + f.fineAmountCents, 0);
  const uninvoicedFines = fines.filter((f) => !f.fineInvoiceId);

  return {
    fines, finesLoading, fetchFines,
    config, configLoading, fetchConfig, updateConfig,
    generateInvoices, generating,
    totalFineAmountCents, uninvoicedFines,
  };
}
