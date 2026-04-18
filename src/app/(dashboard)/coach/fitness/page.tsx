'use client';

import { useState } from 'react';
import { Plus, Activity, Trash2, Dumbbell, HeartPulse } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FitnessTestFormDialog } from '@/components/sport/FitnessTestFormDialog';
import { BiometricFormDialog } from '@/components/sport/BiometricFormDialog';
import { useTeams } from '@/hooks/useSport';
import {
  useFitnessTests, useBiometrics,
  deleteFitnessTest, deleteBiometric,
} from '@/hooks/useFitness';
import type { FitnessTestResult, BiometricMeasurement } from '@/types/fitness';

function playerName(p: FitnessTestResult['studentId'] | BiometricMeasurement['studentId']): string {
  if (typeof p === 'string') return 'Player';
  return `${p.firstName} ${p.lastName}`;
}

export default function CoachFitnessPage() {
  const { teams } = useTeams();
  const { tests, loading: testsLoading, refetch: refetchTests } = useFitnessTests();
  const { measurements, loading: bioLoading, refetch: refetchBio } = useBiometrics();

  const [testFormOpen, setTestFormOpen] = useState(false);
  const [bioFormOpen, setBioFormOpen] = useState(false);

  async function handleDeleteTest(test: FitnessTestResult) {
    if (!confirm('Delete this test result?')) return;
    try { await deleteFitnessTest(test.id); await refetchTests(); } catch { /* toasted */ }
  }

  async function handleDeleteBio(m: BiometricMeasurement) {
    if (!confirm('Delete this measurement?')) return;
    try { await deleteBiometric(m.id); await refetchBio(); } catch { /* toasted */ }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fitness & Biometrics" description="Test results and body measurements" />

      <Tabs defaultValue="tests">
        <TabsList>
          <TabsTrigger value="tests">
            <Dumbbell className="mr-1 h-4 w-4" />
            Fitness tests
          </TabsTrigger>
          <TabsTrigger value="biometrics">
            <HeartPulse className="mr-1 h-4 w-4" />
            Biometrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => setTestFormOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New test
            </Button>
          </div>
          {testsLoading && tests.length === 0 ? (
            <LoadingSpinner />
          ) : tests.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No fitness tests recorded"
              description="Record test results (sprint times, jumps, strength, etc.) to track progression."
            />
          ) : (
            <div className="grid gap-3">
              {tests.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium truncate">{playerName(t.studentId)}</p>
                        <p className="text-sm">
                          <span className="font-mono">{t.testType}</span>: <span className="font-semibold">{t.value}</span> {t.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.date).toLocaleDateString()}
                          {t.notes ? ` · ${t.notes}` : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteTest(t)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="biometrics" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => setBioFormOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New measurement
            </Button>
          </div>
          {bioLoading && measurements.length === 0 ? (
            <LoadingSpinner />
          ) : measurements.length === 0 ? (
            <EmptyState
              icon={HeartPulse}
              title="No biometric measurements"
              description="Log weight, height, body composition, or resting HR."
            />
          ) : (
            <div className="grid gap-3">
              {measurements.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium truncate">{playerName(m.studentId)}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                          {m.weightKg != null && <span>{m.weightKg} kg</span>}
                          {m.heightCm != null && <span>{m.heightCm} cm</span>}
                          {m.bodyFatPct != null && <span>{m.bodyFatPct}% BF</span>}
                          {m.restingHrBpm != null && <span>{m.restingHrBpm} bpm</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.date).toLocaleDateString()}
                          {m.notes ? ` · ${m.notes}` : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteBio(m)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <FitnessTestFormDialog
        open={testFormOpen}
        onOpenChange={setTestFormOpen}
        teams={teams}
        onSuccess={refetchTests}
      />

      <BiometricFormDialog
        open={bioFormOpen}
        onOpenChange={setBioFormOpen}
        teams={teams}
        onSuccess={refetchBio}
      />
    </div>
  );
}
