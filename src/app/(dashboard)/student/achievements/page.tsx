'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Trophy, Star, Medal, Crown, Award } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentAchievements } from '@/hooks/useStudentAchievements';
import { formatDate, cn } from '@/lib/utils';

const categoryIcons: Record<string, typeof Trophy> = {
  academic: Star, sports: Medal, leadership: Crown, service: Award, special: Trophy,
};

export default function StudentAchievementsPage() {
  const { student } = useCurrentStudent();
  const { achievements, earned, houses, loading } = useStudentAchievements();

  if (loading) return <LoadingSpinner />;

  const currentHouse = student?.house ?? houses.find((h) => h.id === student?.houseId);
  const sortedHouses = [...houses].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader title="Achievements" description="Your badges, house points, and rankings" />

      {currentHouse && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: `${currentHouse.color}20` }}>
                  <Trophy className="h-7 w-7" style={{ color: currentHouse.color }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{currentHouse.name}</h3>
                  {currentHouse.motto && <p className="text-sm text-muted-foreground">{currentHouse.motto}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: currentHouse.color }}>{currentHouse.points}</p>
                <p className="text-xs text-muted-foreground">House Points</p>
              </div>
            </div>

            {sortedHouses.length > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedHouses.map((house, i) => (
                  <div key={house.id} className={cn('rounded-lg border p-3 text-center', house.id === currentHouse.id && 'ring-2 ring-primary')}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {i === 0 && <Crown className="h-3 w-3 text-amber-500" />}
                      <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: house.color }}>{house.name}</p>
                    <p className="text-lg font-bold">{house.points}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Earned Badges</CardTitle></CardHeader>
          <CardContent>
            {earned.length === 0 ? (
              <EmptyState icon={Award} title="No Badges Yet" description="Complete challenges to earn badges and house points!" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {earned.map((sa) => {
                  const ach = sa.achievement ?? achievements.find((a) => a.id === sa.achievementId);
                  if (!ach) return null;
                  return (
                    <div key={sa.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <span className="text-3xl">{ach.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{ach.name}</p>
                        <p className="text-xs text-muted-foreground">{ach.description}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary"><Star className="mr-1 h-3 w-3" />{ach.points} pts</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(sa.awardedDate)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {achievements.filter((a) => !earned.find((ea) => ea.achievementId === a.id)).length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Available to Earn</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {achievements.filter((a) => !earned.find((ea) => ea.achievementId === a.id)).map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 rounded-lg border border-dashed p-3 opacity-60">
                      <span className="text-2xl grayscale">{achievement.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">House Leaderboard</CardTitle></CardHeader>
          <CardContent>
            {sortedHouses.length === 0 ? (
              <EmptyState icon={Trophy} title="No houses yet" description="House data will appear here." />
            ) : (
              <div className="space-y-3">
                {sortedHouses.map((house, i) => (
                  <div key={house.id} className={cn('flex items-center gap-3 rounded-lg border p-3', house.id === currentHouse?.id && 'bg-primary/5 border-primary/30')}>
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                      i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : i === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                      : 'bg-muted text-muted-foreground'
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: house.color }}>{house.name}</p>
                      {house.motto && <p className="text-xs text-muted-foreground">{house.motto}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold">{house.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
