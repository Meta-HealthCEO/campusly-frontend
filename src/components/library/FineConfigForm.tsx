'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { FineConfig } from '@/hooks/useLibraryFines';

interface FineConfigFormProps {
  config: FineConfig;
  loading: boolean;
  onSave: (data: Partial<FineConfig>) => Promise<void>;
}

export function FineConfigForm({ config, loading, onSave }: FineConfigFormProps) {
  const [finePerDay, setFinePerDay] = useState('');
  const [maxFine, setMaxFine] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFinePerDay(String(config.finePerDayCents / 100));
    setMaxFine(config.maxFineCents !== undefined ? String(config.maxFineCents / 100) : '');
  }, [config]);

  if (loading) return <LoadingSpinner />;

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Partial<FineConfig> = {
        finePerDayCents: Math.round(Number(finePerDay) * 100),
      };
      if (maxFine) {
        data.maxFineCents = Math.round(Number(maxFine) * 100);
      }
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fine Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="finePerDay">Fine per day (Rands) <span className="text-destructive">*</span></Label>
            <Input
              id="finePerDay"
              type="number"
              min="0"
              step="0.50"
              value={finePerDay}
              onChange={(e) => setFinePerDay(e.target.value)}
              placeholder="2.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxFine">Maximum fine (Rands)</Label>
            <Input
              id="maxFine"
              type="number"
              min="0"
              step="1"
              value={maxFine}
              onChange={(e) => setMaxFine(e.target.value)}
              placeholder="No limit"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !finePerDay}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}
