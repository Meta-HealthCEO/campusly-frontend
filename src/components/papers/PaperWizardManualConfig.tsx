'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ManualSectionDraft {
  title: string;
  instructions?: string;
}

interface ManualSectionPayload {
  title: string;
  instructions?: string;
  questions: [];
}

interface Props {
  onCreate: (sections: ManualSectionPayload[]) => Promise<void>;
}

function letterFor(index: number): string {
  return String.fromCharCode(65 + Math.min(index, 25));
}

export function PaperWizardManualConfig({ onCreate }: Props) {
  const [sections, setSections] = useState<ManualSectionDraft[]>([
    { title: 'Section A' },
  ]);
  const [creating, setCreating] = useState(false);

  const addSection = (): void => {
    setSections((prev: ManualSectionDraft[]) => [
      ...prev,
      { title: `Section ${letterFor(prev.length)}` },
    ]);
  };

  const removeSection = (idx: number): void => {
    setSections((prev: ManualSectionDraft[]) =>
      prev.filter((_: ManualSectionDraft, i: number) => i !== idx),
    );
  };

  const updateSection = (
    idx: number,
    patch: Partial<ManualSectionDraft>,
  ): void => {
    setSections((prev: ManualSectionDraft[]) =>
      prev.map((s: ManualSectionDraft, i: number) =>
        i === idx ? { ...s, ...patch } : s,
      ),
    );
  };

  const handleCreate = async (): Promise<void> => {
    setCreating(true);
    try {
      const payload: ManualSectionPayload[] = sections.map(
        (s: ManualSectionDraft) => ({
          title: s.title,
          instructions: s.instructions,
          questions: [] as [],
        }),
      );
      await onCreate(payload);
    } finally {
      setCreating(false);
    }
  };

  const allTitlesFilled = sections.every(
    (s: ManualSectionDraft) => s.title.trim().length > 0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Manual Mode</p>
        <p className="text-muted-foreground">
          Define empty sections now. After creating, you&apos;ll add questions
          on the paper detail page from the Question Bank or as custom
          questions.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((s: ManualSectionDraft, idx: number) => (
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

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={s.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSection(idx, { title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
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

      <Button
        onClick={handleCreate}
        disabled={creating || sections.length === 0 || !allTitlesFilled}
        className="w-full"
      >
        {creating ? 'Creating...' : 'Create Paper Shell'}
      </Button>
    </div>
  );
}
