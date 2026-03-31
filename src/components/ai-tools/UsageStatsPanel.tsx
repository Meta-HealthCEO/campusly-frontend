'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Zap, FileText, RefreshCw, Loader2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAITools } from '@/hooks/useAITools';

const typeLabels: Record<string, string> = {
  paper_generation: 'Paper Generation',
  question_regeneration: 'Question Regeneration',
  grading: 'Grading',
};

const typeIcons: Record<string, typeof FileText> = {
  paper_generation: FileText,
  question_regeneration: RefreshCw,
  grading: Zap,
};

export function UsageStatsPanel() {
  const { usageStats, loadUsageStats, loading } = useAITools();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadUsageStats();
  }, [loadUsageStats]);

  const handleFilter = () => {
    loadUsageStats(startDate || undefined, endDate || undefined);
  };

  if (loading && !usageStats) {
    return (
      <Card>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button size="sm" onClick={handleFilter} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Filter
            </Button>
          </div>

          {usageStats && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total API Calls</p>
                  <p className="text-2xl font-bold">{usageStats.totalCalls}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Input Tokens</p>
                  <p className="text-2xl font-bold">
                    {usageStats.totalInputTokens.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Output Tokens</p>
                  <p className="text-2xl font-bold">
                    {usageStats.totalOutputTokens.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Breakdown by Type</h4>
                {usageStats.byType.map((entry) => {
                  const Icon = typeIcons[entry.type] ?? Zap;
                  return (
                    <div key={entry.type} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {typeLabels[entry.type] ?? entry.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.inputTokens.toLocaleString()} in / {entry.outputTokens.toLocaleString()} out
                        </p>
                      </div>
                      <Badge variant="secondary">{entry.count} calls</Badge>
                    </div>
                  );
                })}
                {usageStats.byType.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No usage data for the selected period.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
