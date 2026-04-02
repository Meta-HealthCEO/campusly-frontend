'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Trophy } from 'lucide-react'
import type { AptitudeResult } from '@/types'

interface AptitudeResultsProps {
  result: AptitudeResult
  onExploreCareers?: (cluster: string) => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function AptitudeResults({ result, onExploreCareers }: AptitudeResultsProps) {
  const sortedClusters = [...result.clusters].sort(
    (a, b) => a.rank - b.rank
  )
  const topCluster = sortedClusters[0]

  return (
    <div className="space-y-6">
      {/* Personality Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-5 text-primary" />
            Personality Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-bold">{result.personalityType}</p>
        </CardContent>
      </Card>

      {/* Career Clusters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-5 text-primary" />
            Career Clusters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedClusters.map((cluster) => {
            const isTop = cluster.rank === 1

            return (
              <div
                key={cluster.name}
                className={`rounded-lg border p-3 space-y-2 ${
                  isTop ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold truncate">
                    {cluster.name}
                  </h4>
                  <Badge variant={isTop ? 'default' : 'secondary'}>
                    #{cluster.rank}
                  </Badge>
                </div>
                <Progress value={cluster.score} />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {cluster.description}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Suggested Careers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Suggested Careers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.suggestedCareers.map((career: string) => (
              <Badge key={career} variant="outline">
                {career}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA + Date */}
      <div className="space-y-3">
        {topCluster && onExploreCareers && (
          <Button
            className="w-full"
            onClick={() => onExploreCareers(topCluster.name)}
          >
            Explore {topCluster.name} careers
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Completed on {formatDate(result.completedAt)}
        </p>
      </div>
    </div>
  )
}
