'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlayerCardDisplay } from '@/components/sport/PlayerCardDisplay';
import { PersonalBestTable } from '@/components/sport/PersonalBestTable';
import { RecordPersonalBestDialog } from '@/components/sport/RecordPersonalBestDialog';
import { AIReportGenerator } from '@/components/sport/AIReportGenerator';
import { AIReportView } from '@/components/sport/AIReportView';
import { useSportStats } from '@/hooks/useSportStats';
import { useAISports } from '@/hooks/useAISports';
import type { RecordPersonalBestPayload } from '@/types/sport';
import type { AIPerformanceReport } from '@/types/ai-sports';

export default function PlayerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.studentId as string;
  const initialSport = searchParams.get('sport') ?? '';

  const {
    playerCard, personalBests, sportConfigs, loading,
    loadPlayerCard, loadPersonalBests, loadSportConfigs,
    recordPersonalBest, recalculateCard,
  } = useSportStats();

  const [activeSport, setActiveSport] = useState(initialSport);
  const [pbDialogOpen, setPbDialogOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [latestAIReport, setLatestAIReport] = useState<AIPerformanceReport | null>(null);

  const {
    reports: aiReports, generating: aiGenerating,
    generatePlayerAnalysis, generateDevelopmentPlan,
    generateScoutingReport, generateParentReport, loadReports: loadAIReports,
  } = useAISports();

  useEffect(() => { loadSportConfigs(); }, [loadSportConfigs]);

  useEffect(() => {
    if (!studentId || !activeSport) return;
    loadPlayerCard(studentId, activeSport);
    loadPersonalBests(studentId, activeSport);
    loadAIReports(studentId, activeSport);
  }, [studentId, activeSport, loadPlayerCard, loadPersonalBests, loadAIReports]);

  // Set initial sport from configs if not provided
  useEffect(() => {
    if (!activeSport && sportConfigs.length > 0) {
      setActiveSport(sportConfigs[0].code);
    }
  }, [activeSport, sportConfigs]);

  const handleRecalculate = useCallback(async () => {
    if (!activeSport) return;
    try {
      setRecalculating(true);
      await recalculateCard(studentId, activeSport);
      loadPlayerCard(studentId, activeSport);
    } catch (err: unknown) {
      toast.error('Failed to recalculate card');
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  }, [studentId, activeSport, recalculateCard, loadPlayerCard]);

  const handleRecordPB = useCallback(async (payload: RecordPersonalBestPayload) => {
    await recordPersonalBest(studentId, payload);
    loadPersonalBests(studentId, activeSport);
  }, [studentId, activeSport, recordPersonalBest, loadPersonalBests]);

  const handleGenerateReport = useCallback(async (type: string): Promise<AIPerformanceReport | undefined> => {
    if (!activeSport) return undefined;
    let report: AIPerformanceReport | undefined;
    switch (type) {
      case 'analysis':
        report = await generatePlayerAnalysis(studentId, activeSport);
        break;
      case 'development':
        report = await generateDevelopmentPlan(studentId, activeSport);
        break;
      case 'scouting':
        report = await generateScoutingReport(studentId, activeSport);
        break;
      case 'parent':
        report = await generateParentReport(studentId, activeSport);
        break;
    }
    if (report) {
      setLatestAIReport(report);
      loadAIReports(studentId, activeSport);
    }
    return report;
  }, [studentId, activeSport, generatePlayerAnalysis, generateDevelopmentPlan, generateScoutingReport, generateParentReport, loadAIReports]);

  if (loading && !playerCard) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={playerCard?.studentName ?? 'Player Profile'}
        description="Player card, personal bests, and career statistics"
      />

      {/* Sport tabs */}
      {sportConfigs.length > 1 && (
        <Tabs value={activeSport} onValueChange={setActiveSport}>
          <TabsList className="flex-wrap">
            {sportConfigs.map((c) => (
              <TabsTrigger key={c.code} value={c.code}>{c.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-reports">AI Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <div className="flex flex-col items-center gap-4">
              {playerCard ? (
                <PlayerCardDisplay card={playerCard} />
              ) : (
                <p className="text-sm text-muted-foreground">No card available for this sport.</p>
              )}
              <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating || !activeSport}>
                <RefreshCw className={`mr-1 h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
                Recalculate Card
              </Button>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Personal Bests</h3>
                <Button size="sm" onClick={() => setPbDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Record PB
                </Button>
              </div>
              <PersonalBestTable bests={personalBests} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai-reports" className="space-y-6 mt-4">
          <AIReportGenerator
            studentId={studentId}
            sportCode={activeSport}
            generating={aiGenerating}
            onGenerate={handleGenerateReport}
          />
          {latestAIReport && <AIReportView report={latestAIReport} />}
          {aiReports.length > 0 && !latestAIReport && (
            <div className="space-y-3">
              <h3 className="font-semibold">Previous Reports</h3>
              {aiReports.map((r) => (
                <AIReportView key={r.id} report={r} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RecordPersonalBestDialog
        open={pbDialogOpen}
        onOpenChange={setPbDialogOpen}
        sportCode={activeSport}
        onSubmit={handleRecordPB}
      />
    </div>
  );
}
