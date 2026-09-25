'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Countdown, ExamMap, MarksToGain, NextUp, ReadinessBand, TrendChart } from '@/components/readiness';
import { EXAMPLE_READINESS as EX } from '@/lib/readiness/example-data';
import { formatExamDate } from '@/lib/readiness/countdown';
import { layoutExamMap, totalMarksToGain, type ExamTopic } from '@/lib/readiness/exam-map';
import { GallerySection, Specimen } from './GallerySection';

/** A fixed "today", so the countdown in the gallery never drifts (32 days to Paper 1). */
const NOW = new Date(2026, 8, 25);

/** One untested topic (neutral tile, never red) and one worth 0 marks (left out, Review Focus 1). */
const EDGE_TOPICS: ExamTopic[] = [
  { id: 'trig', name: 'Trigonometry', section: 'Paper 2', marks: 40, mastery: 66 },
  { id: 'analytical', name: 'Analytical geometry', section: 'Paper 2', marks: 40, mastery: null },
  { id: 'stats', name: 'Statistics', section: 'Paper 2', marks: 20, mastery: 45 },
  { id: 'none', name: 'Worth 0 marks: never drawn', section: 'Paper 2', marks: 0, mastery: 80 },
];

/** A long topic name beside small ones: it clamps to two lines and never widens the page at 320px (Review Focus 4). */
const LONG_TOPICS: ExamTopic[] = [
  { id: 'euclid', name: 'Euclidean geometry and measurement, including proofs', section: 'Paper 2', marks: 50, mastery: 58 },
  { id: 'trig-2', name: 'Trigonometry', section: 'Paper 2', marks: 25, mastery: 74 },
  { id: 'stats-2', name: 'Statistics', section: 'Paper 2', marks: 15, mastery: 100 },
];

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-sm text-muted-foreground">
      {label} <b className="font-heading text-body font-bold tabular-nums text-foreground">{value}</b>
    </span>
  );
}

/** The approved mockup's learner (direction C), built from the real readiness components. */
export function ReadinessExamples() {
  const atStake = useMemo(() => Math.round(totalMarksToGain(layoutExamMap(EX.topics))), []);
  const first = EX.trend[0];
  const latest = EX.trend[EX.trend.length - 1];
  return (
    <GallerySection
      id="readiness"
      index="05"
      title="Readiness"
      description="Example data only: Anele, Ms Dube and the numbers are made up. Block size is marks in the exam; colour is mastery."
    >
      <div className="space-y-1">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">{EX.subject} · {EX.grade}</p>
        <h3 className="font-heading text-h1 font-bold tracking-[-0.025em] md:text-h1-desktop">Your exam readiness</h3>
        <p className="text-sm text-muted-foreground">{EX.learner} · updated after Thursday&apos;s test</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <Countdown paper={EX.paper} examDate={EX.examDate} now={NOW} />
              <ReadinessBand low={EX.band.low} high={EX.band.high} target={EX.band.target} />
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <Fact label="Target" value={`${EX.band.target}%`} />
                <Fact label="Marks at stake" value={`${atStake} of ${EX.total}`} />
                <Fact label="Exam" value={formatExamDate(EX.examDate)} />
                <Fact label="Based on" value={`${EX.answers} answers`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>The exam, mapped</CardTitle>
              <CardDescription>Each block is a {EX.paper} topic, sized by its marks and coloured by your mastery.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExamMap paper={EX.paper} topics={EX.topics} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Marks to gain</CardTitle>
              <CardDescription>Where the next marks are, biggest first.</CardDescription>
            </CardHeader>
            <CardContent>
              <MarksToGain topics={EX.topics} />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <div id="next-up" className="scroll-mt-32">
            <NextUp {...EX.nextUp} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Predicted {EX.paper} mark, week by week.</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                points={EX.trend}
                target={EX.band.target}
                label={`Predicted ${EX.paper} mark over six weeks, from ${first.value}% to ${latest.value}%; target ${EX.band.target}%`}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Specimen title="Untested topic, and a 0-mark topic left out">
          <ExamMap paper="Paper 2" topics={EDGE_TOPICS} />
        </Specimen>
        <Specimen title="Long topic name at phone width">
          <ExamMap paper="Paper 2" topics={LONG_TOPICS} />
        </Specimen>
      </div>
    </GallerySection>
  );
}
