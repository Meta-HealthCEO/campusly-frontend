'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, Star, Award, Medal, Heart } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { ApiAchievement, PopulatedStudent, PopulatedUser } from '@/hooks/useAchiever';

interface AchievementCardProps {
  achievement: ApiAchievement;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const typeConfig: Record<string, { label: string; color: string; icon: typeof Star }> = {
  academic: { label: 'Academic', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400', icon: Star },
  sport: { label: 'Sport', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400', icon: Medal },
  cultural: { label: 'Cultural', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400', icon: Award },
  behaviour: { label: 'Behaviour', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400', icon: Heart },
};

function getStudentName(studentId: string | PopulatedStudent): string {
  if (typeof studentId === 'string') return studentId;
  const s = studentId;
  if (s.user) return `${s.user.firstName} ${s.user.lastName}`;
  if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
  return s.admissionNumber ?? 'Unknown';
}

function getAwarderName(awardedBy: string | PopulatedUser): string {
  if (typeof awardedBy === 'string') return awardedBy;
  return `${awardedBy.firstName} ${awardedBy.lastName}`;
}

export function AchievementCard({ achievement, showActions, onEdit, onDelete }: AchievementCardProps) {
  const config = typeConfig[achievement.type] ?? typeConfig.academic;
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{achievement.title}</p>
                <p className="text-xs text-muted-foreground">{getStudentName(achievement.studentId)}</p>
              </div>
              {showActions && (
                <div className="flex gap-1 shrink-0">
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={onEdit}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="sm" onClick={onDelete}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {achievement.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{achievement.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className={config.color}>{config.label}</Badge>
              {achievement.category && (
                <Badge variant="outline" className="text-xs">{achievement.category}</Badge>
              )}
              <Badge variant="secondary">
                <Star className="mr-1 h-3 w-3" />{achievement.points} pts
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(achievement.awardedAt)} &middot; by {getAwarderName(achievement.awardedBy)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { getStudentName, getAwarderName };
