'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { VerifyResultCard } from '@/components/courses/VerifyResultCard';
import { useCertificate } from '@/hooks/useCertificate';
import type { VerifyCertificateResult } from '@/types';

export default function VerifyCertificatePage() {
  const params = useParams();
  const code = (params.code as string) ?? '';
  const { verifyCertificate } = useCertificate();
  const [result, setResult] = useState<VerifyCertificateResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await verifyCertificate(code);
      if (!cancelled) setResult(r);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [code, verifyCertificate]);

  if (!result) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return <VerifyResultCard result={result} code={code} />;
}
