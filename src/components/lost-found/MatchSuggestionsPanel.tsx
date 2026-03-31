'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { LostReport } from '@/types';
import type { MatchSuggestion } from '@/hooks/useLostFound';

interface MatchSuggestionsPanelProps {
  report: LostReport;
  fetchSuggestions: (itemId: string) => Promise<MatchSuggestion[]>;
  onMatch: (lostId: string, foundId: string) => Promise<void>;
}

export function MatchSuggestionsPanel({ report, fetchSuggestions, onMatch }: MatchSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const results = await fetchSuggestions(report.id);
      if (!cancelled) {
        setSuggestions(results);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [report.id, fetchSuggestions]);

  if (loading) return null;
  if (suggestions.length === 0) return null;

  const handleMatch = async (foundId: string) => {
    setMatching(foundId);
    try {
      await onMatch(report.id, foundId);
      setSuggestions((prev) => prev.filter((s) => s.id !== foundId));
    } finally {
      setMatching(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Match Suggestions for &ldquo;{report.itemName}&rdquo;
        </CardTitle>
        <CardDescription>Potential found items matching this lost report</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {suggestions.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{item.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  Found at {item.locationFound ?? 'unknown location'} on {formatDate(item.dateFound ?? '')}
                </p>
              </div>
              <Button
                size="xs"
                disabled={matching === item.id}
                onClick={() => handleMatch(item.id)}
              >
                {matching === item.id ? 'Matching...' : 'Match'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
