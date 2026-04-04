'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { CapsComplianceReport, CapsLevel } from '@/types/question-bank';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CAPS_BAR_LABELS: Record<CapsLevel, string> = {
  knowledge: 'Knowledge',
  routine: 'Routine',
  complex: 'Complex',
  problem_solving: 'Problem Solving',
};

const CAPS_ORDER: CapsLevel[] = ['knowledge', 'routine', 'complex', 'problem_solving'];

interface BarData {
  level: CapsLevel;
  label: string;
  actual: number;
  target: number;
  outOfRange: boolean;
}

function computeBars(
  dist: CapsComplianceReport['cognitiveDistribution'],
  target: CapsComplianceReport['targetDistribution'],
): BarData[] {
  // Backend already returns values as percentages — use them directly
  const distMap: Record<CapsLevel, number> = {
    knowledge: dist.knowledge,
    routine: dist.routine,
    complex: dist.complex,
    problem_solving: dist.problemSolving,
  };
  const targetMap: Record<CapsLevel, number> = {
    knowledge: target.knowledge,
    routine: target.routine,
    complex: target.complex,
    problem_solving: target.problemSolving,
  };

  return CAPS_ORDER.map((level) => {
    const actual = distMap[level];
    const targetPct = targetMap[level];
    const outOfRange = Math.abs(actual - targetPct) > 5;
    return { level, label: CAPS_BAR_LABELS[level], actual, target: targetPct, outOfRange };
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function CognitiveBar({ bar }: { bar: BarData }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{bar.label}</span>
        <span className={bar.outOfRange ? 'text-destructive font-medium' : ''}>
          {bar.actual}% / {bar.target}%
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        {/* Target line */}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/40 z-10"
          style={{ left: `${Math.min(bar.target, 100)}%` }}
        />
        {/* Actual bar */}
        <div
          className={`h-full rounded-full transition-all ${
            bar.outOfRange ? 'bg-destructive' : 'bg-primary'
          }`}
          style={{ width: `${Math.min(bar.actual, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface CompliancePanelProps {
  compliance: CapsComplianceReport | null;
  totalMarks: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CompliancePanel({ compliance, totalMarks }: CompliancePanelProps) {
  const bars = useMemo(() => {
    if (!compliance) return [];
    return computeBars(
      compliance.cognitiveDistribution,
      compliance.targetDistribution,
    );
  }, [compliance]);

  if (!compliance) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        No compliance data available. Add questions to see CAPS analysis.
      </div>
    );
  }

  const { difficultySpread } = compliance;

  return (
    <div className="space-y-5">
      {/* Overall status + marks */}
      <div className="flex flex-wrap items-center gap-3">
        {compliance.compliant ? (
          <Badge className="gap-1 bg-primary/10 text-primary">
            <CheckCircle2 className="size-3" />
            Compliant
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" />
            Non-compliant
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          Total: <strong className="text-foreground">{totalMarks} marks</strong>
        </span>
      </div>

      {/* Cognitive distribution bars */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Cognitive Distribution</h4>
        {bars.map((bar) => (
          <CognitiveBar key={bar.level} bar={bar} />
        ))}
      </div>

      {/* Violations */}
      {compliance.violations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Violations</h4>
          <ul className="space-y-1">
            {compliance.violations.map((v: string, i: number) => (
              <li key={i} className="text-xs text-destructive">
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Topic coverage */}
      {compliance.topicCoverage.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Topic Coverage</h4>
          <div className="grid gap-1">
            {compliance.topicCoverage.map((tc) => (
              <div
                key={tc.nodeId}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground truncate mr-2">
                  {tc.title}
                </span>
                <span className="shrink-0 font-medium">{tc.marks} marks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Difficulty spread */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Difficulty Spread</h4>
        <div className="grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-2">
            <div className="font-medium text-base">{difficultySpread.easy}</div>
            <div className="text-muted-foreground">Easy</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <div className="font-medium text-base">{difficultySpread.medium}</div>
            <div className="text-muted-foreground">Medium</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <div className="font-medium text-base">{difficultySpread.hard}</div>
            <div className="text-muted-foreground">Hard</div>
          </div>
        </div>
      </div>
    </div>
  );
}
