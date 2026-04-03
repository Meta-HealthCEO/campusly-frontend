'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Heart, Plus, BarChart3 } from 'lucide-react';
import { MoodDashboardCards } from '@/components/wellbeing/MoodDashboardCards';
import { MoodTrendChart, FeelingDistributionChart } from '@/components/wellbeing/MoodCharts';
import { SurveyBuilder } from '@/components/wellbeing/SurveyBuilder';
import { SurveyResultsView } from '@/components/wellbeing/SurveyResultsView';
import { useWellbeingSurveys } from '@/hooks/useWellbeingSurveys';
import { useMoodDashboard } from '@/hooks/useMoodDashboard';
import type { CreateSurveyPayload, WellbeingSurvey } from '@/types';

export default function AdminWellbeingPage() {
  const { surveys, results, loading, fetchSurveys, createSurvey, fetchResults, updateSurvey } = useWellbeingSurveys();
  const { data: moodData, loading: moodLoading, fetchDashboard } = useMoodDashboard();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [period, setPeriod] = useState('month');
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  useEffect(() => {
    fetchSurveys();
    fetchDashboard({ period: 'month' });
  }, []);

  useEffect(() => {
    fetchDashboard({ period: period as 'week' | 'month' | 'term' });
  }, [period]);

  const handleCreateSurvey = async (data: CreateSurveyPayload) => {
    await createSurvey(data);
    await fetchSurveys();
  };

  const handleViewResults = async (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    await fetchResults(surveyId);
  };

  const handleActivateSurvey = async (id: string) => {
    await updateSurvey(id, { status: 'active' });
    await fetchSurveys();
  };

  if (loading && surveys.length === 0 && moodLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Wellbeing" description="Student mood tracking and surveys">
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Survey
        </Button>
      </PageHeader>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Mood Dashboard</TabsTrigger>
          <TabsTrigger value="surveys">Surveys ({surveys.length})</TabsTrigger>
          {results && <TabsTrigger value="results">Results</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-4">
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v: string | null) => setPeriod(v ?? 'month')}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="term">This Term</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {moodData ? (
            <>
              <MoodDashboardCards data={moodData} />
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Mood Trend</CardTitle></CardHeader>
                  <CardContent><MoodTrendChart data={moodData} /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Feeling Distribution</CardTitle></CardHeader>
                  <CardContent><FeelingDistributionChart data={moodData} /></CardContent>
                </Card>
              </div>
            </>
          ) : (
            <EmptyState icon={Heart} title="No mood data" description="Create and administer a survey to start tracking mood." />
          )}
        </TabsContent>

        <TabsContent value="surveys" className="mt-4 space-y-4">
          {surveys.length === 0 ? (
            <EmptyState icon={BarChart3} title="No surveys" description="Create your first wellbeing survey." />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {surveys.map((s: WellbeingSurvey) => (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm truncate">{s.title}</CardTitle>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                        {s.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.startDate).toLocaleDateString()} — {new Date(s.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs">Grades: {s.targetGrades.join(', ')}</p>
                    <p className="text-xs">{s.responseCount ?? 0} responses</p>
                    <div className="flex gap-2 pt-1">
                      {s.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => handleActivateSurvey(s.id)}>
                          Activate
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleViewResults(s.id)}>
                        Results
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {results && (
          <TabsContent value="results" className="mt-4">
            <SurveyResultsView results={results} />
          </TabsContent>
        )}
      </Tabs>

      <SurveyBuilder open={builderOpen} onOpenChange={setBuilderOpen} onSubmit={handleCreateSurvey} />
    </div>
  );
}
