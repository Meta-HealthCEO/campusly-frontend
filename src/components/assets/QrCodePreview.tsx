'use client';

import { QrCode } from 'lucide-react';

interface QrCodePreviewProps {
  asset: {
    assetTag: string;
    name: string;
    qrUrl?: string;
  };
}

export function QrCodePreview({ asset }: QrCodePreviewProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4 w-full sm:w-48">
      {asset.qrUrl ? (
        <img
          src={asset.qrUrl}
          alt={`QR code for ${asset.assetTag}`}
          className="h-32 w-32 object-contain rounded"
        />
      ) : (
        <div className="flex h-32 w-32 flex-col items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 bg-muted/40 gap-2">
          <QrCode className="h-10 w-10 text-muted-foreground/50" />
          <span className="text-[10px] font-mono text-muted-foreground text-center leading-tight px-1">
            {asset.assetTag}
          </span>
        </div>
      )}
      <div className="text-center">
        <p className="text-xs font-mono font-semibold">{asset.assetTag}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[11rem]">{asset.name}</p>
      </div>
    </div>
  );
}
