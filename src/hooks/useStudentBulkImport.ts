import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { BulkImportValidationResult, BulkImportResult } from '@/types';

interface BulkImportState {
  validating: boolean;
  importing: boolean;
  validationResult: BulkImportValidationResult | null;
  importResult: BulkImportResult | null;
  error: string | null;
}

export function useStudentBulkImport() {
  const [state, setState] = useState<BulkImportState>({
    validating: false,
    importing: false,
    validationResult: null,
    importResult: null,
    error: null,
  });

  const uploadAndValidate = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, validating: true, error: null, validationResult: null, importResult: null }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/students/bulk-import/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrapResponse<BulkImportValidationResult>(res);
      setState((prev) => ({ ...prev, validating: false, validationResult: data }));
      return data;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to validate CSV');
      setState((prev) => ({ ...prev, validating: false, error: message }));
      return null;
    }
  }, []);

  const confirmImport = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, importing: true, error: null }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrapResponse<BulkImportResult>(res);
      setState((prev) => ({ ...prev, importing: false, importResult: data }));
      return data;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to import students');
      setState((prev) => ({ ...prev, importing: false, error: message }));
      return null;
    }
  }, []);

  const downloadTemplate = useCallback(async () => {
    try {
      const res = await apiClient.get('/students/bulk-import/template', {
        responseType: 'blob',
      });
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student-import-template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Failed to download template', err);
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      validating: false,
      importing: false,
      validationResult: null,
      importResult: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    uploadAndValidate,
    confirmImport,
    downloadTemplate,
    reset,
  };
}
