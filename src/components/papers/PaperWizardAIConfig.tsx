'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AIPaperSectionConfig } from '@/types/papers';

interface Props {
  totalMarks: number;
  onGenerate: (sections: AIPaperSectionConfig[]) => Promise<void>;
}

function letterFor(index: number): string {
  return String.fromCharCode(65 + Math.min(index, 25));
}

export function PaperWizardAIConfig({ totalMarks, onGenerate }: Props) {
  const [sections, setSections] = useState<AIPaperSectionConfig[]>([
    {
      title: 'Section A',
      questionCount: 5,
      sectionMarks: Math.floor(totalMarks / 2) || 1,
    },
    {
      title: 'Section B',
      questionCount: 3,
      sectionMarks: Math.ceil(totalMarks / 2) || 1,
    },
  ]);
  const [generating, setGenerating] = useState(false);

  const addSection = (): void => {
    setSections((prev: AIPaperSectionConfig[]) => [
      ...prev,
      {
        title: `Section ${letterFor(prev.length)}`,
        questionCount: 3,
        sectionMarks: 10,
      },
    ]);
  };

  const removeSection = (idx: number): void => {
    setSections((prev: AIPaperSectionConfig[]) =>
      prev.filter((_: AIPaperSectionConfig, i: number) => i !== idx),
    );
  };

  const updateSection = (
    idx: number,
    patch: Partial<AIPaperSectionConfig>,
  ): void => {
    setSections((prev: AIPaperSectionConfig[]) =>
      prev.map((s: AIPaperSectionConfig, i: number) =>
        i === idx ? { ...s, ...patch } : s,
      ),
    );
  };

  const totalSectionMarks = sections.reduce(
    (sum: number, s: AIPaperSectionConfig) => sum + (s.sectionMarks || 0),
    0,
  );
  const marksMismatch = totalSectionMarks !== totalMarks;

  const handleGenerate = async (): Promise<void> => {
    setGenerating(true);
    try {
      await onGenerate(sections);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">AI Generation</p>
        <p className="text-muted-foreground">
          Configure sections — Claude will generate CAPS-aligned questions
          matching your topics and difficulty. Generation usually takes ~30
          seconds.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((s: AIPaperSectionConfig, idx: number) => (
          <div key={idx} className="rounded-md border p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">Section {idx + 1}</p>
              {sections.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSection(idx)}
                  aria-label={`Remove section ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1">
                <Label>Title</Label>
                <Input
                  value={s.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSection(idx, { title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Questions</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={s.questionCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSection(idx, { questionCount: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Marks</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={s.sectionMarks}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSection(idx, { sectionMarks: Number(e.target.value) })
                  }
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label>Instructions (optional)</Label>
                <Input
                  value={s.instructions ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSection(idx, { instructions: e.target.value })
                  }
                  placeholder="e.g. Answer all questions in this section."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addSection}>
        <Plus className="h-4 w-4 mr-1" />
        Add Section
      </Button>

      <div
        className={`text-sm ${
          marksMismatch ? 'text-destructive' : 'text-muted-foreground'
        }`}
      >
        Total marks: {totalSectionMarks} / {totalMarks}
        {marksMismatch ? ' (must match)' : ' OK'}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={generating || marksMismatch || sections.length === 0}
        className="w-full"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {generating ? 'Generating... (this takes ~30s)' : 'Generate Paper'}
      </Button>
    </div>
  );
}
