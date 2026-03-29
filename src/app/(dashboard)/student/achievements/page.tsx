'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Trophy, Star, Medal, Crown, Award } from 'lucide-react';
import {
  mockAchievements,
  mockStudentAchievements,
  mockStudents,
  mockHouses,
} from '@/lib/mock-data';
import { formatDate, cn } from '@/lib/utils';

const currentStudent = mockStudents[0];
const currentHouse = currentStudent.house;

// Earned achievements
const earnedAchievements = mockStudentAchievements.filter(
  (sa) => sa.studentId === currentStudent.id
);

// Leaderboard - mock top 5 students by total achievement points
const leaderboard = mockStudents.slice(0, 5).map((student, i) => {
  const studentAchievements = mockStudentAchievements.filter(
    (sa) => sa.studentId === student.id
  );
  const totalPoints = studentAchievements.reduce(
    (sum, sa) => sum + sa.achievement.points,
    0
  );
  return {
    rank: i + 1,
    student,
    points: totalPoints > 0 ? totalPoints : 80 - i * 15,
  };
}).sort((a, b) => b.points - a.points).map((entry, i) => ({ ...entry, rank: i + 1 }));

const categoryIcons: Record<string, typeof Trophy> = {
  academic: Star,
  sports: Medal,
  leadership: Crown,
  service: Award,
  special: Trophy,
};

export default function StudentAchievementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievements"
        description="Your badges, house points, and rankings"
      />

      {/* House Points */}
      {currentHouse && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${currentHouse.color}20` }}
                >
                  <Trophy
                    className="h-7 w-7"
                    style={{ color: currentHouse.color }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{currentHouse.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentHouse.motto}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: currentHouse.color }}>
                  {currentHouse.points}
                </p>
                <p className="text-xs text-muted-foreground">House Points</p>
              </div>
            </div>

            {/* All houses comparison */}
            <div className="mt-6 grid grid-cols-4 gap-3">
              {mockHouses
                .sort((a, b) => b.points - a.points)
                .map((house, i) => (
                  <div
                    key={house.id}
                    className={cn(
                      'rounded-lg border p-3 text-center',
                      house.id === currentHouse.id && 'ring-2 ring-primary'
                    )}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {i === 0 && <Crown className="h-3 w-3 text-amber-500" />}
                      <span className="text-xs font-medium text-muted-foreground">
                        #{i + 1}
                      </span>
                    </div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: house.color }}
                    >
                      {house.name}
                    </p>
                    <p className="text-lg font-bold">{house.points}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earned Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Earned Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {earnedAchievements.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No Badges Yet"
                description="Complete challenges to earn badges and house points!"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {earnedAchievements.map((sa) => {
                  const CategoryIcon =
                    categoryIcons[sa.achievement.category] || Trophy;
                  return (
                    <div
                      key={sa.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <span className="text-3xl">{sa.achievement.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {sa.achievement.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sa.achievement.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary">
                            <Star className="mr-1 h-3 w-3" />
                            {sa.achievement.points} pts
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(sa.awardedDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Unearned achievements */}
            {mockAchievements.filter(
              (a) => !earnedAchievements.find((ea) => ea.achievementId === a.id)
            ).length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Available to Earn
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {mockAchievements
                    .filter(
                      (a) =>
                        !earnedAchievements.find(
                          (ea) => ea.achievementId === a.id
                        )
                    )
                    .map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-center gap-3 rounded-lg border border-dashed p-3 opacity-60"
                      >
                        <span className="text-2xl grayscale">
                          {achievement.icon}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {achievement.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.student.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3',
                    entry.student.id === currentStudent.id &&
                      'bg-primary/5 border-primary/30'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                      entry.rank === 1
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : entry.rank === 2
                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        : entry.rank === 3
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {entry.rank}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {entry.student.user.firstName}{' '}
                      {entry.student.user.lastName}
                      {entry.student.id === currentStudent.id && (
                        <span className="ml-1 text-xs text-primary">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.student.house?.name || 'No house'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold">
                      {entry.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
