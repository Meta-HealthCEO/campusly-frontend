'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import type { Asset } from '@/types';

interface QrBatchSelectorProps {
  assets: Asset[];
  onGenerate: (assetIds: string[]) => Promise<void>;
}

export function QrBatchSelector({ assets, onGenerate }: QrBatchSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const allSelected = assets.length > 0 && selectedIds.size === assets.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map((a: Asset) => a.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleGenerate() {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    try {
      await onGenerate(Array.from(selectedIds));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={allSelected}
            data-indeterminate={someSelected}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm font-medium">
            {allSelected ? 'Deselect all' : 'Select all'}
          </span>
        </label>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} asset{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          )}
          <Button
            size="default"
            disabled={selectedIds.size === 0 || generating}
            onClick={handleGenerate}
            className="w-full sm:w-auto"
          >
            <QrCode className="mr-2 h-4 w-4" />
            {generating ? 'Generating…' : 'Generate QR Codes'}
          </Button>
        </div>
      </div>

      {/* Asset list */}
      <div className="rounded-lg border divide-y">
        {assets.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No assets available.</p>
        )}
        {assets.map((asset: Asset) => (
          <label
            key={asset.id}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <Checkbox
              checked={selectedIds.has(asset.id)}
              onCheckedChange={() => toggleOne(asset.id)}
            />
            <span className="font-mono text-xs text-muted-foreground w-24 shrink-0 truncate">
              {asset.assetTag}
            </span>
            <span className="text-sm truncate">{asset.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
