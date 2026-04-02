'use client';

import type { SubjectCombinationRecommendation } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SubjectAdvisorResultsProps {
  recommendations: SubjectCombinationRecommendation[];
}

export function SubjectAdvisorResults({
  recommendations,
}: SubjectAdvisorResultsProps) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No subject combination recommendations available.
      </p>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {recommendations.map(
        (rec: SubjectCombinationRecommendation, index: number) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold">Option {index + 1}</h3>
                <Badge variant="secondary" className="shrink-0">
                  {rec.programmesUnlocked}{' '}
                  {rec.programmesUnlocked === 1 ? 'programme' : 'programmes'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Subject combination */}
              <div className="flex flex-wrap gap-1">
                {rec.subjectCombination.map((subject: string) => (
                  <Badge key={subject} variant="default" className="text-xs">
                    {subject}
                  </Badge>
                ))}
              </div>

              {/* Reasoning */}
              <p className="text-sm text-muted-foreground">{rec.reasoning}</p>

              {/* Career paths */}
              {rec.careerPaths.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Career paths
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {rec.careerPaths.map((path: string) => (
                      <Badge
                        key={path}
                        variant="outline"
                        className="text-xs text-muted-foreground"
                      >
                        {path}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
