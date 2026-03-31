'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { TermYearFilter } from '@/components/achiever/TermYearFilter';
import { WallOfFame } from '@/components/achiever/WallOfFame';
import { TopMarksList } from '@/components/achiever/TopMarksList';
import { HouseLeaderboard } from '@/components/achiever/HouseLeaderboard';
import { AchievementCard } from '@/components/achiever/AchievementCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { Award, Trophy } from 'lucide-react';
import { useAchiever } from '@/hooks/useAchiever';
import type { WallOfFameData, TopMarkEntry, ApiHousePoints, ApiAchievement } from '@/hooks/useAchiever';

export default function AdminAchieverPage() {
  const { fetchWallOfFame, fetchTopMarks, fetchLeaderboard, fetchAchievements } = useAchiever();

  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [wallOfFame, setWallOfFame] = useState<WallOfFameData | null>(null);
  const [wofLoading, setWofLoading] = useState(true);

  const [topMarks, setTopMarks] = useState<TopMarkEntry[]>([]);
  const [tmLoading, setTmLoading] = useState(true);

  const [leaderboard, setLeaderboard] = useState<ApiHousePoints[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  const [recentAwards, setRecentAwards] = useState<ApiAchievement[]>([]);
  const [raLoading, setRaLoading] = useState(true);

  const loadData = useCallback(async () => {
    setWofLoading(true);
    setTmLoading(true);
    setLbLoading(true);
    setRaLoading(true);

    const params: Record<string, number> = { year };
    if (term > 0) params.term = term;

    const [wof, lb, ra] = await Promise.allSettled([
      fetchWallOfFame(params),
      fetchLeaderboard(params),
      fetchAchievements({ ...params, limit: 5 }),
    ]);

    if (wof.status === 'fulfilled') setWallOfFame(wof.value);
    setWofLoading(false);

    if (lb.status === 'fulfilled') setLeaderboard(lb.value);
    setLbLoading(false);

    if (ra.status === 'fulfilled') setRecentAwards(ra.value.items);
    setRaLoading(false);

    // Top marks requires term
    if (term > 0) {
      try {
        const tm = await fetchTopMarks({ term, academicYear: year });
        setTopMarks(tm);
      } catch {
        setTopMarks([]);
      }
    } else {
      setTopMarks([]);
    }
    setTmLoading(false);
  }, [term, year, fetchWallOfFame, fetchTopMarks, fetchLeaderboard, fetchAchievements]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-6">
      <PageHeader title="Achiever" description="Wall of fame, leaderboards, and recognition">
        <TermYearFilter term={term} year={year} onTermChange={setTerm} onYearChange={setYear} showAllTerms />
      </PageHeader>

      <Tabs defaultValue="wall-of-fame">
        <TabsList>
          <TabsTrigger value="wall-of-fame">Wall of Fame</TabsTrigger>
          <TabsTrigger value="top-marks">Top by Marks</TabsTrigger>
        </TabsList>

        <TabsContent value="wall-of-fame">
          <WallOfFame data={wallOfFame} loading={wofLoading} />
        </TabsContent>
        <TabsContent value="top-marks">
          {term === 0 ? (
            <Card><CardContent className="py-8">
              <EmptyState icon={Award} title="Select a term" description="Top by Marks requires a specific term to be selected." />
            </CardContent></Card>
          ) : (
            <TopMarksList entries={topMarks} loading={tmLoading} />
          )}
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <HouseLeaderboard houses={leaderboard} loading={lbLoading} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Recent Awards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {raLoading ? (
              <LoadingSpinner />
            ) : recentAwards.length === 0 ? (
              <EmptyState icon={Trophy} title="No awards yet" description="Awards will appear here." />
            ) : (
              <div className="space-y-3">
                {recentAwards.map((a) => (
                  <AchievementCard key={a._id} achievement={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
