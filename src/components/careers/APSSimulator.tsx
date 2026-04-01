'use client'

import { useState, useCallback } from 'react'
import { Calculator, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type {
  APSResult,
  APSSimulationAdjustment,
  APSSimulationResult,
} from '@/types'

interface APSSimulatorProps {
  aps: APSResult
  onSimulate: (adjustments: APSSimulationAdjustment[]) => Promise<APSSimulationResult>
}

export function APSSimulator({ aps, onSimulate }: APSSimulatorProps) {
  const [adjustments, setAdjustments] = useState<Record<string, number>>({})
  const [result, setResult] = useState<APSSimulationResult | null>(null)
  const [simulating, setSimulating] = useState(false)

  const handleSliderChange = useCallback(
    (subjectId: string, value: number[]) => {
      const newVal = value[0]
      setAdjustments((prev) => ({ ...prev, [subjectId]: newVal }))
      setResult(null)
    },
    []
  )

  const changedSubjects = aps.subjects.filter((s) => {
    const adj = adjustments[s.subjectId]
    return adj !== undefined && adj !== s.currentPercentage
  })

  const hasChanges = changedSubjects.length > 0

  const handleSimulate = async () => {
    if (!hasChanges) return
    setSimulating(true)
    try {
      const payload: APSSimulationAdjustment[] = changedSubjects.map((s) => ({
        subjectId: s.subjectId,
        hypotheticalPercentage: adjustments[s.subjectId],
      }))
      const res = await onSimulate(payload)
      setResult(res)
    } catch (err: unknown) {
      console.error('Simulation failed', err)
    } finally {
      setSimulating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="size-5 text-primary" />
          <CardTitle>What-If Simulator</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Adjust your subject percentages to see how your APS changes.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subject Sliders */}
        <div className="space-y-4">
          {aps.subjects.map((subject) => {
            const current = adjustments[subject.subjectId] ?? subject.currentPercentage
            const isChanged = current !== subject.currentPercentage
            return (
              <SubjectSlider
                key={subject.subjectId}
                subjectId={subject.subjectId}
                name={subject.name}
                originalPercentage={subject.currentPercentage}
                currentValue={current}
                isChanged={isChanged}
                onChange={handleSliderChange}
              />
            )
          })}
        </div>

        {/* Simulate Button */}
        <Button
          onClick={handleSimulate}
          disabled={!hasChanges || simulating}
          className="w-full"
        >
          {simulating ? 'Simulating...' : 'Simulate'}
        </Button>

        {/* Results */}
        {result && <SimulationResults result={result} />}
      </CardContent>
    </Card>
  )
}

/* --- Sub-components --- */

interface SubjectSliderProps {
  subjectId: string
  name: string
  originalPercentage: number
  currentValue: number
  isChanged: boolean
  onChange: (subjectId: string, value: number[]) => void
}

function SubjectSlider({
  subjectId,
  name,
  originalPercentage,
  currentValue,
  isChanged,
  onChange,
}: SubjectSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate mr-2">{name}</span>
        <span className={isChanged ? 'font-semibold text-primary' : 'text-muted-foreground'}>
          {currentValue}%
          {isChanged && (
            <span className="text-xs text-muted-foreground ml-1">
              (was {originalPercentage}%)
            </span>
          )}
        </span>
      </div>
      <Slider
        value={[currentValue]}
        min={0}
        max={100}
        step={1}
        onValueChange={(val: number[]) => onChange(subjectId, val)}
      />
    </div>
  )
}

interface SimulationResultsProps {
  result: APSSimulationResult
}

function SimulationResults({ result }: SimulationResultsProps) {
  return (
    <div className="space-y-4 border-t pt-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Current APS</p>
          <p className="text-xl font-bold">{result.currentAPS}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Simulated APS</p>
          <p className="text-xl font-bold text-primary">{result.simulatedAPS}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Improvement</p>
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="size-4 text-emerald-500" />
            <p className="text-xl font-bold text-emerald-600">+{result.improvement}</p>
          </div>
        </div>
      </div>

      {/* New programmes unlocked */}
      {result.newProgrammesUnlocked > 0 && (
        <p className="text-sm text-center font-medium text-primary">
          {result.newProgrammesUnlocked} new programme{result.newProgrammesUnlocked !== 1 ? 's' : ''} unlocked
        </p>
      )}

      {/* Per-subject changes */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Subject Changes
        </h4>
        <div className="divide-y">
          {result.subjects.map((subject) => (
            <div key={subject.name} className="flex items-center justify-between py-2 text-sm">
              <span className="truncate mr-2">{subject.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">{subject.currentAPS}</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="font-medium">{subject.simulatedAPS}</span>
                <ChangeIndicator change={subject.change} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChangeIndicator({ change }: { change: string }) {
  if (change === '0' || change === '+0' || change === '-0') return null

  const isPositive = change.startsWith('+') && change !== '+0'
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
        isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'
      }`}
    >
      {change}
    </span>
  )
}
