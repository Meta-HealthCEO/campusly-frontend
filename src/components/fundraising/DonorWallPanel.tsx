'use client';

import { useEffect } from 'react';
import { Heart } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { Campaign, DonorWallEntry } from '@/hooks/useFundraising';

interface DonorWallPanelProps {
  campaigns: Campaign[];
  selectedCampaignId: string;
  onCampaignChange: (id: string) => void;
  entries: DonorWallEntry[];
  loading: boolean;
  onFetch: (campaignId: string) => void;
}

export function DonorWallPanel({
  campaigns, selectedCampaignId, onCampaignChange,
  entries, loading, onFetch,
}: DonorWallPanelProps) {
  useEffect(() => {
    if (selectedCampaignId) {
      onFetch(selectedCampaignId);
    }
  }, [selectedCampaignId, onFetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedCampaignId} onValueChange={(v: unknown) => onCampaignChange(v as string)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select campaign" /></SelectTrigger>
          <SelectContent>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCampaignId && (
        <p className="text-sm text-muted-foreground">Select a campaign to view its donor wall.</p>
      )}

      {loading && <LoadingSpinner />}

      {!loading && selectedCampaignId && entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No donor wall entries yet.</p>
      )}

      {!loading && entries.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <CardTitle className="text-sm">{entry.donorName}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{formatCurrency(entry.amount)}</p>
                {entry.message && (
                  <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{entry.message}&rdquo;</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
