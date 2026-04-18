'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  RefreshCw, Plus, Activity, HeartPulse, Trophy, Sparkles,
  Calendar, ArrowLeft, User, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { PlayerCardDisplay } from '@/components/sport/PlayerCardDisplay';
import { PersonalBestTable } from '@/components/sport/PersonalBestTable';
import { RecordPersonalBestDialog } from '@/components/sport/RecordPersonalBestDialog';
import { AIReportGenerator } from '@/components/sport/AIReportGenerator';
import { AIReportView } from '@/components/sport/AIReportView';
import { PlayerFitnessQuickAdd } from '@/components/sport/PlayerFitnessQuickAdd';
import { PlayerBiometricQuickAdd } from '@/components/sport/PlayerBiometricQuickAdd';
import { BenchmarkScoreBar } from '@/components/sport/BenchmarkScoreBar';
import { useSportStats } from '@/hooks/useSportStats';
import { useAISports } from '@/hooks/useAISports';
import { usePlayerSnapshot, useStudent, useBenchmarks } from '@/hooks/usePlayerProfile';
import { useFitnessTests, useBiometrics, deleteFitnessTest, deleteBiometric } from '@/hooks/useFitness';
import { Trash2 } from 'lucide-react';
import type { CareerStats, StudentMatchEntry, RecordPersonalBestPayload } from '@/types/sport';
import type { AIPerformanceReport } from '@/types/ai-sports';

function calcAge(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
}

function studentDisplayName(s: { admissionNumber?: string; userId?: unknown } | null): string {
  if (!s) return 'Player';
  const u = s.userId as { firstName?: string; lastName?: string } | undefined | null;
  if (u && (u.firstName || u.lastName)) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  if (s.admissionNumber) {
    const m = s.admissionNumber.match(/^[A-Z]+-\d+\s+(.+)$/);
    return m ? m[1] : s.admissionNumber;
  }
  return 'Player';
}

export default function CoachPlayerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const initialSport = searchParams.get('sport') ?? '';

  const { student } = useStudent(studentId);

  const {
    playerCard, personalBests, sportConfigs, loading,
    loadPlayerCard, loadPersonalBests, loadSportConfigs,
    recordPersonalBest, recalculateCard, getPlayerCareerStats, getStudentMatchHistory,
  } = useSportStats();

  const [activeSport, setActiveSport] = useState(initialSport);
  const [pbDialogOpen, setPbDialogOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [latestAIReport, setLatestAIReport] = useState<AIPerformanceReport | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [matches, setMatches] = useState<StudentMatchEntry[]>([]);

  const { snapshot, refetch: refetchSnapshot } = usePlayerSnapshot(studentId, activeSport);
  const { tests, refetch: refetchTests } = useFitnessTests(
    studentId ? { studentId } : {},
  );
  const { measurements, refetch: refetchBio } = useBiometrics(
    studentId ? { studentId } : {},
  );
  const benchmarks = useBenchmarks(activeSport, snapshot?.ageGroup ?? '');

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
    (async () => {
      const cs = await getPlayerCareerStats(studentId, activeSport);
      setCareerStats(cs);
      const ms = await getStudentMatchHistory(studentId, activeSport);
      setMatches(ms);
    })();
  }, [studentId, activeSport, loadPlayerCard, loadPersonalBests, loadAIReports, getPlayerCareerStats, getStudentMatchHistory]);

  useEffect(() => {
    if (!activeSport && sportConfigs.length > 0) {
      setActiveSport(sportConfigs[0].code);
    }
  }, [activeSport, sportConfigs]);

  const playerName = useMemo(
    () => playerCard?.studentName ?? studentDisplayName(student),
    [playerCard, student],
  );

  const age = calcAge(student?.dateOfBirth);
  const benchmarkByTest = useMemo(() => {
    const map = new Map<string, typeof benchmarks[number]>();
    benchmarks.forEach((b) => map.set(b.testType, b));
    return map;
  }, [benchmarks]);

  const handleRecalculate = useCallback(async () => {
    if (!activeSport) return;
    try {
      setRecalculating(true);
      await recalculateCard(studentId, activeSport);
      await loadPlayerCard(studentId, activeSport);
      await refetchSnapshot();
      toast.success('Player card recalculated');
    } catch (err: unknown) {
      toast.error('Failed to recalculate card');
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  }, [studentId, activeSport, recalculateCard, loadPlayerCard, refetchSnapshot]);

  const handleAfterDataChange = useCallback(async () => {
    await Promise.all([refetchTests(), refetchBio(), refetchSnapshot()]);
    if (activeSport) await handleRecalculate();
  }, [refetchTests, refetchBio, refetchSnapshot, activeSport, handleRecalculate]);

  const handleRecordPB = useCallback(async (payload: RecordPersonalBestPayload) => {
    await recordPersonalBest(studentId, payload);
    await loadPersonalBests(studentId, activeSport);
    await handleAfterDataChange();
  }, [studentId, activeSport, recordPersonalBest, loadPersonalBests, handleAfterDataChange]);

  const handleGenerateReport = useCallback(async (type: string): Promise<AIPerformanceReport | undefined> => {
    if (!activeSport) return undefined;
    let report: AIPerformanceReport | undefined;
    switch (type) {
      case 'analysis': report = await generatePlayerAnalysis(studentId, activeSport); break;
      case 'development': report = await generateDevelopmentPlan(studentId, activeSport); break;
      case 'scouting': report = await generateScoutingReport(studentId, activeSport); break;
      case 'parent': report = await generateParentReport(studentId, activeSport); break;
    }
    if (report) {
      setLatestAIReport(report);
      loadAIReports(studentId, activeSport);
    }
    return report;
  }, [studentId, activeSport, generatePlayerAnalysis, generateDevelopmentPlan, generateScoutingReport, generateParentReport, loadAIReports]);

  if (loading && !playerCard && !student) return <LoadingSpinner />;

  const teamId: string | undefined = undefined;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="self-start">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={playerName}
          description={[
            age ? `${age} years` : null,
            snapshot?.ageGroup ?? null,
            playerCard?.position ?? null,
            snapshot?.bmi ? `BMI ${snapshot.bmi}` : null,
          ].filter(Boolean).join(' · ')}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          {sportConfigs.length > 0 && (
            <Select value={activeSport} onValueChange={(v: unknown) => setActiveSport((v as string) ?? '')}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Pick a sport" />
              </SelectTrigger>
              <SelectContent>
                {sportConfigs.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="default"
            onClick={handleRecalculate}
            disabled={recalculating || !activeSport}
          >
            {recalculating ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Recalculating</>
            ) : (
              <><RefreshCw className="mr-1 h-4 w-4" />Recalculate Card</>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><User className="mr-1 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="fitness"><Activity className="mr-1 h-4 w-4" />Fitness</TabsTrigger>
          <TabsTrigger value="biometrics"><HeartPulse className="mr-1 h-4 w-4" />Biometrics</TabsTrigger>
          <TabsTrigger value="matches"><Calendar className="mr-1 h-4 w-4" />Match History</TabsTrigger>
          <TabsTrigger value="bests"><Trophy className="mr-1 h-4 w-4" />Personal Bests</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="mr-1 h-4 w-4" />AI Reports</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Card */}
            <div className="flex flex-col items-center gap-3">
              {playerCard ? (
                <PlayerCardDisplay card={playerCard} />
              ) : (
                <Card className="w-full max-w-[220px]">
                  <CardContent className="space-y-3 p-6 text-center">
                    <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-sm">No card yet for this sport.</p>
                    <p className="text-xs text-muted-foreground">Add fitness data or play matches, then recalculate.</p>
                    <Button size="sm" onClick={handleRecalculate} disabled={recalculating || !activeSport}>
                      {recalculating ? 'Generating...' : 'Generate first card'}
                    </Button>
                  </CardContent>
                </Card>
              )}
              {playerCard && (
                <div className="text-center text-xs text-muted-foreground">
                  {playerCard.appearances ?? 0} apps · form {playerCard.formTrend ?? '—'}
                </div>
              )}
            </div>

            {/* Benchmark scores */}
            <Card className="lg:col-span-2">
              <CardContent className="space-y-3 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Fitness benchmarks</h3>
                  {snapshot?.ageGroup && (
                    <Badge variant="outline">Age group: {snapshot.ageGroup}</Badge>
                  )}
                </div>
                {!snapshot || Object.keys(snapshot.scores).length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No benchmarked tests yet"
                    description="Add fitness test results in the Fitness tab — they'll be scored against age-group benchmarks here."
                  />
                ) : (
                  <div className="space-y-3">
                    {Object.entries(snapshot.scores).map(([testType, score]) => {
                      const latest = snapshot.latest[testType];
                      const bench = benchmarkByTest.get(testType);
                      const summary = bench
                        ? `${bench.ageGroup} ${bench.sportCode}: elite ${bench.eliteValue}${bench.unit} · gold ${bench.goldValue} · silver ${bench.silverValue} · bronze ${bench.bronzeValue}`
                        : undefined;
                      return (
                        <BenchmarkScoreBar
                          key={testType}
                          testType={testType}
                          value={latest?.value ?? 0}
                          unit={latest?.unit ?? ''}
                          score={score}
                          benchmarkSummary={summary}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FITNESS */}
        <TabsContent value="fitness" className="mt-4 space-y-4">
          <PlayerFitnessQuickAdd
            studentId={studentId}
            sportCode={activeSport}
            teamId={teamId}
            onAdded={handleAfterDataChange}
          />

          {tests.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No fitness tests recorded"
              description="Use the form above to log a test. The card recalculates automatically."
            />
          ) : (
            <div className="grid gap-2">
              {tests.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm">
                        <span className="font-mono">{t.testType}</span>
                        <span className="ml-2 font-semibold">{t.value}</span>
                        <span className="ml-1 text-muted-foreground">{t.unit}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()}
                        {t.notes && ` · ${t.notes}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={async () => {
                        if (!confirm('Delete this test?')) return;
                        await deleteFitnessTest(t.id);
                        await handleAfterDataChange();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* BIOMETRICS */}
        <TabsContent value="biometrics" className="mt-4 space-y-4">
          <PlayerBiometricQuickAdd
            studentId={studentId}
            onAdded={handleAfterDataChange}
          />
          {measurements.length === 0 ? (
            <EmptyState icon={HeartPulse} title="No measurements" description="Log weight, height, body fat, or resting HR above." />
          ) : (
            <div className="grid gap-2">
              {measurements.map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap gap-x-3 text-sm">
                        {m.weightKg != null && <span><span className="font-semibold">{m.weightKg}</span> kg</span>}
                        {m.heightCm != null && <span><span className="font-semibold">{m.heightCm}</span> cm</span>}
                        {m.bodyFatPct != null && <span><span className="font-semibold">{m.bodyFatPct}</span>% BF</span>}
                        {m.restingHrBpm != null && <span><span className="font-semibold">{m.restingHrBpm}</span> bpm</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</p>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={async () => {
                        if (!confirm('Delete this measurement?')) return;
                        await deleteBiometric(m.id);
                        await handleAfterDataChange();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MATCHES */}
        <TabsContent value="matches" className="mt-4">
          {matches.length === 0 ? (
            <EmptyState icon={Calendar} title="No match history" description="Match data appears here once stats are recorded." />
          ) : (
            <div className="grid gap-2">
              {matches.map((mat, idx) => (
                <Card key={idx}>
                  <CardContent className="space-y-1 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">vs {mat.opponent}</p>
                      <Badge variant="outline">{mat.result ?? '—'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(mat.date).toLocaleDateString()} · {mat.venue}
                      {mat.rating != null && ` · Rating ${mat.rating}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PERSONAL BESTS */}
        <TabsContent value="bests" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPbDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />Record PB
            </Button>
          </div>
          <PersonalBestTable bests={personalBests} />
        </TabsContent>

        {/* AI REPORTS */}
        <TabsContent value="ai" className="mt-4 space-y-4">
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
