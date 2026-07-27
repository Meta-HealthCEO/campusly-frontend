'use client';

import { Activity, Calendar, HeartPulse, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { PlayerFitnessQuickAdd } from '@/components/sport/PlayerFitnessQuickAdd';
import { PlayerBiometricQuickAdd } from '@/components/sport/PlayerBiometricQuickAdd';
import { BenchmarkScoreBar } from '@/components/sport/BenchmarkScoreBar';
import { deleteFitnessTest, deleteBiometric } from '@/hooks/useFitness';
import type {
  AgeGroupBenchmark,
  BiometricMeasurement,
  FitnessSnapshot,
  FitnessTestResult,
} from '@/types/fitness';
import type { StudentMatchEntry } from '@/types/sport';

interface FitnessTabProps {
  studentId: string;
  sportCode: string;
  teamId: string | undefined;
  tests: FitnessTestResult[];
  onDataChange: () => Promise<void>;
}

export function PlayerFitnessTab({
  studentId, sportCode, teamId, tests, onDataChange,
}: FitnessTabProps) {
  return (
    <>
      <PlayerFitnessQuickAdd
        studentId={studentId}
        sportCode={sportCode}
        teamId={teamId}
        onAdded={onDataChange}
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
                    await onDataChange();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

interface BiometricsTabProps {
  studentId: string;
  measurements: BiometricMeasurement[];
  onDataChange: () => Promise<void>;
}

export function PlayerBiometricsTab({
  studentId, measurements, onDataChange,
}: BiometricsTabProps) {
  return (
    <>
      <PlayerBiometricQuickAdd
        studentId={studentId}
        onAdded={onDataChange}
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
                    await onDataChange();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function PlayerMatchesTab({ matches }: { matches: StudentMatchEntry[] }) {
  if (matches.length === 0) {
    return (
      <EmptyState icon={Calendar} title="No match history" description="Match data appears here once stats are recorded." />
    );
  }
  return (
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
  );
}

interface PlayerBenchmarksCardProps {
  snapshot: FitnessSnapshot | null;
  benchmarkByTest: Map<string, AgeGroupBenchmark>;
}

/** Overview card scoring the player's latest tests against age-group benchmarks. */
export function PlayerBenchmarksCard({ snapshot, benchmarkByTest }: PlayerBenchmarksCardProps) {
  return (
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
  );
}
