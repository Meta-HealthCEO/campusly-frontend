'use client';

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { QrCode } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { QrBatchSelector } from '@/components/assets';
import { useAssets } from '@/hooks/useAssets';
import { useAssetReports } from '@/hooks/useAssetReports';

export default function QrLabelsPage() {
  const { assets, loading, fetchAssets } = useAssets();
  const { generateBatchQrCodes } = useAssetReports();

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  const handleGenerate = useCallback(
    async (assetIds: string[]) => {
      try {
        const url = await generateBatchQrCodes(assetIds);
        toast.success('QR codes generated — opening download...');
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (err: unknown) {
        console.error('Failed to generate QR codes:', err);
        toast.error('Failed to generate QR codes. Please try again.');
      }
    },
    [generateBatchQrCodes],
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="QR Labels"
        description="Select assets and generate a batch QR code sheet for printing."
      />

      {loading ? (
        <LoadingSpinner />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No assets found"
          description="Add assets to the system before generating QR labels."
        />
      ) : (
        <div className="rounded-lg border bg-card p-4">
          <QrBatchSelector assets={assets} onGenerate={handleGenerate} />
        </div>
      )}
    </div>
  );
}
