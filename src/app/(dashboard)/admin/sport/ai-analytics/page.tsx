'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, Play } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TalentFlagCard } from '@/components/sport/TalentFlagCard';
import { AIReportView } from '@/components/sport/AIReportView';
import { useAISports } from '@/hooks/useAISports';
import { useSportStats } from '@/hooks/useSportStats';
import { useCan } from '@/hooks/useCan';
import type { TalentFlagStatus } from '@/types/ai-sports';

export default function AISportsAnalyticsPage() {
  const canManage = useCan('manage_sport_config');
  const {
    talentFlags, reports, currentReport, generating, loading,
    runTalentIdentification, loadTalentFlags, reviewTalentFlag,
    loadReports, loadReport,
  } = useAISports();
  const { sportConfigs, loadSportConfigs } = useSportStats();

  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => { loadSportConfigs(); }, [loadSportConfigs]);

  useEffect(() => {
    const sport = selectedSport === 'all' ? undefined : selectedSport;
    loadTalentFlags(sport);
    loadReports(undefined, sport);
  }, [selectedSport, loadTalentFlags, loadReports]);

  useEffect(() => {
    if (selectedReportId) loadReport(selectedReportId);
  }, [selectedReportId, loadReport]);

  const handleRunTalentId = useCallback(async () => {
    const sport = selectedSport === 'all' ? (sportConfigs[0]?.code ?? '') : selectedSport;
    if (!sport) return;
    await runTalentIdentification(sport);
  }, [selectedSport, sportConfigs, runTalentIdentification]);

  const handleReview = useCallback((id: string, status: TalentFlagStatus) => {
    reviewTalentFlag(id, status);
  }, [reviewTalentFlag]);

  return (
    <div className="space-y-6">
      <PageHeader title="AI Sports Analytics" description="AI-powered talent identification and performance analysis">
        <Select value={selectedSport} onValueChange={(v: unknown) => { if (v) setSelectedSport(v as string); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All sports" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {sportConfigs.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Talent Identification */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Talent Identification</h2>
          <Button onClick={handleRunTalentId} disabled={generating || !canManage}>
            <Play className="mr-1 h-4 w-4" />
            {generating ? 'Running...' : 'Run Talent ID'}
          </Button>
        </div>

        {loading && talentFlags.length === 0 && <LoadingSpinner />}

        {!loading && talentFlags.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="No talent flags"
            description="Run talent identification to discover promising athletes."
          />
        )}

        {talentFlags.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {talentFlags.map((flag) => (
              <TalentFlagCard key={flag.id} flag={flag} onReview={handleReview} />
            ))}
          </div>
        )}
      </section>

      {/* Recent AI Reports */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent AI Reports</h2>

        {reports.length === 0 && !loading && (
          <EmptyState
            icon={Sparkles}
            title="No reports yet"
            description="Generate reports from individual player profiles."
          />
        )}

        {reports.length > 0 && !selectedReportId && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedReportId(report.id)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{report.sportCode}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">
                    {report.reportType.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{report.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedReportId && currentReport && (
          <div className="space-y-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedReportId(null)}>
              Back to reports
            </Button>
            <AIReportView report={currentReport} />
          </div>
        )}
      </section>
    </div>
  );
}
