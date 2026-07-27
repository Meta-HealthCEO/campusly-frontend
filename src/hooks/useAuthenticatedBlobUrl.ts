'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

/**
 * Fetch an auth-gated binary resource via the axios client (which carries
 * the Authorization header a native `<img src>` request would lack) and
 * expose it as an object URL. The URL is revoked on unmount / path change.
 */
export function useAuthenticatedBlobUrl(path: string): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    apiClient
      .get(path, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(res.data as Blob);
        setBlobUrl(createdUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [path]);

  return blobUrl;
}
