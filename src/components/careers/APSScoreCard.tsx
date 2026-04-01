'use client'

import { Award, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { APSResult } from '@/types'

const RATING_LABELS: Record<number, string> = {
  7: 'Outstanding',
  6: 'Meritorious',
  5: 'Substantial',
  4: 'Adequate',
  3: 'Moderate',
  2: 'Elementary',
  1: 'Not Achieved',
}

function getRatingColor(rating: number): string {
  if (rating >= 6) return 'bg-emerald-500 text-white'
  if (rating >= 4) return 'bg-amber-500 text-white'
  return 'bg-destructive text-white'
}

interface APSScoreCardProps {
  aps: APSResult
}

export function APSScoreCard({ aps }: APSScoreCardProps) {
  const percentage = aps.maxAPS > 0 ? Math.round((aps.totalAPS / aps.maxAPS) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="size-5 text-primary" />
          <CardTitle>APS Score</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total APS Display */}
        <div className="text-center space-y-3">
          <div className="text-4xl font-bold tracking-tight">
            {aps.totalAPS}
            <span className="text-lg text-muted-foreground font-normal">
              /{aps.maxAPS}
            </span>
          </div>
          <Progress value={percentage} className="h-3" />
          <p className="text-sm text-muted-foreground">{percentage}% of maximum</p>
        </div>

        {/* Subject List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Subjects
          </h4>
          <div className="divide-y">
            {aps.subjects.map((subject) => (
              <SubjectRow
                key={subject.subjectId}
                name={subject.name}
                percentage={subject.currentPercentage}
                rating={subject.rating}
                apsPoints={subject.apsPoints}
              />
            ))}
          </div>
        </div>

        {/* Life Orientation (excluded from total) */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="size-4" />
            <span className="font-medium">Life Orientation</span>
            <span className="ml-auto text-xs italic">Excluded from total</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{aps.lifeOrientation.percentage}%</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRatingColor(
                aps.lifeOrientation.apsPoints >= 6 ? 6 : aps.lifeOrientation.apsPoints >= 4 ? 4 : 1
              )}`}
            >
              {aps.lifeOrientation.apsPoints} pts
            </span>
          </div>
          {aps.lifeOrientation.note && (
            <p className="text-xs text-muted-foreground">{aps.lifeOrientation.note}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface SubjectRowProps {
  name: string
  percentage: number
  rating: number
  apsPoints: number
}

function SubjectRow({ name, percentage, rating, apsPoints }: SubjectRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{percentage}%</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRatingColor(rating)}`}
        >
          {apsPoints} pts
        </span>
        <span className="text-xs text-muted-foreground w-20 text-right hidden sm:inline">
          {RATING_LABELS[rating] ?? `Rating ${rating}`}
        </span>
      </div>
    </div>
  )
}
