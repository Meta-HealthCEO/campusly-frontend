'use client';

import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AIPaperSectionConfig } from '@/types/papers';

interface Props {
  totalMarks: number;
  onGenerate: (sections: AIPaperSectionConfig[]) => Promise<void>;
}

type PlanId = 'balanced' | 'exam' | 'single';

const PLANS: Array<{
  id: PlanId;
  label: string;
  desc: string;
}> = [
  { id: 'balanced', label: 'Balanced', desc: 'Short and structured questions' },
  { id: 'exam', label: 'Exam Style', desc: 'Three sections with mixed demand' },
  { id: 'single', label: 'Single Section', desc: 'One clean paper section' },
];

function splitMarks(totalMarks: number, weights: number[]): number[] {
  const raw = weights.map((weight) => Math.max(1, Math.round(totalMarks * weight)));
  const used = raw.slice(0, -1).reduce((sum, marks) => sum + marks, 0);
  raw[raw.length - 1] = Math.max(1, totalMarks - used);
  return raw;
}

function sectionsForPlan(plan: PlanId, totalMarks: number): AIPaperSectionConfig[] {
  if (plan === 'single') {
    return [
      {
        title: 'Section A',
        questionCount: Math.max(3, Math.round(totalMarks / 10)),
        sectionMarks: totalMarks,
      },
    ];
  }

  if (plan === 'exam') {
    const [sectionA, sectionB, sectionC] = splitMarks(totalMarks, [0.3, 0.4, 0.3]);
    return [
      {
        title: 'Section A',
        instructions: 'Short questions',
        questionCount: 6,
        sectionMarks: sectionA,
      },
      {
        title: 'Section B',
        instructions: 'Structured questions',
        questionCount: 4,
        sectionMarks: sectionB,
      },
      {
        title: 'Section C',
        instructions: 'Extended response',
        questionCount: 2,
        sectionMarks: sectionC,
      },
    ];
  }

  const [sectionA, sectionB] = splitMarks(totalMarks, [0.4, 0.6]);
  return [
    {
      title: 'Section A',
      instructions: 'Core knowledge and routine questions',
      questionCount: 5,
      sectionMarks: sectionA,
    },
    {
      title: 'Section B',
      instructions: 'Structured application questions',
      questionCount: 4,
      sectionMarks: sectionB,
    },
  ];
}

export function PaperWizardAIConfig({ totalMarks, onGenerate }: Props) {
  const [plan, setPlan] = useState<PlanId>('balanced');
  const [generating, setGenerating] = useState(false);
  const sections = useMemo(() => sectionsForPlan(plan, totalMarks), [plan, totalMarks]);

  const handleGenerate = async (): Promise<void> => {
    setGenerating(true);
    try {
      await onGenerate(sections);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Paper Structure</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPlan(item.id)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                plan === item.id
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:bg-muted',
              )}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{section.title}</p>
              {section.instructions && (
                <p className="text-xs text-muted-foreground">{section.instructions}</p>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{section.sectionMarks} marks</p>
              <p>{section.questionCount} questions</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
        <Sparkles className="mr-2 h-4 w-4" />
        {generating ? 'Generating paper and memo...' : 'Generate Paper and Memo'}
      </Button>
    </div>
  );
}
