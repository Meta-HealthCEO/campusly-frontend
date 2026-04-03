'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { TaxTable } from '@/types';

export function useTaxConfig() {
  const [taxTable, setTaxTable] = useState<TaxTable | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTaxTable = useCallback(async (taxYear?: number) => {
    setLoading(true);
    try {
      const params = taxYear !== undefined ? { taxYear } : undefined;
      const response = await apiClient.get('/payroll/tax-tables', { params });
      const data = unwrapResponse<TaxTable>(response);
      setTaxTable(data);
    } catch (err: unknown) {
      console.error('Failed to fetch tax table:', extractErrorMessage(err));
      setTaxTable(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTaxTable = useCallback(async (data: Omit<TaxTable, 'id' | 'schoolId'>): Promise<TaxTable> => {
    const response = await apiClient.post('/payroll/tax-tables', data);
    const saved = unwrapResponse<TaxTable>(response);
    setTaxTable(saved);
    return saved;
  }, []);

  return { taxTable, loading, fetchTaxTable, saveTaxTable };
}
