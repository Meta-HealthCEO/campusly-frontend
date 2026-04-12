import { useCallback } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { Certificate, VerifyCertificateResult } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4500/api';

/**
 * Hook for certificate download, metadata fetch, and public verification.
 *
 * - `downloadCertificate(enrolmentId)` — fetches the PDF as a blob and
 *   triggers a browser file download.
 * - `fetchCertificateMeta(enrolmentId)` — fetches JSON metadata for a
 *   certificate. Returns null on error (callers handle the empty state).
 * - `verifyCertificate(code)` — PUBLIC call (uses plain axios, no auth).
 *   Used by the public verify page.
 */
export function useCertificate() {
  const downloadCertificate = useCallback(async (enrolmentId: string): Promise<void> => {
    try {
      const res = await apiClient.get(`/enrolments/${enrolmentId}/certificate`, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${enrolmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to download certificate'));
    }
  }, []);

  const fetchCertificateMeta = useCallback(
    async (enrolmentId: string): Promise<Certificate | null> => {
      try {
        const res = await apiClient.get(`/enrolments/${enrolmentId}/certificate/meta`);
        return unwrapResponse<Certificate>(res);
      } catch {
        return null;
      }
    },
    [],
  );

  const verifyCertificate = useCallback(
    async (code: string): Promise<VerifyCertificateResult> => {
      try {
        const res = await axios.get(`${API_URL}/certificates/verify/${code}`);
        return unwrapResponse<VerifyCertificateResult>(res);
      } catch {
        return { valid: false };
      }
    },
    [],
  );

  return { downloadCertificate, fetchCertificateMeta, verifyCertificate };
}
