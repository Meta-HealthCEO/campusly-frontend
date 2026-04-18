'use client';

import { useState } from 'react';
import { BookMarked, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FRAMEWORKS = [
  { id: 'caps', label: 'CAPS', description: 'Curriculum & Assessment Policy (South Africa)' },
  { id: 'cambridge', label: 'Cambridge', description: 'Cambridge International Curriculum' },
  { id: 'ib', label: 'IB', description: 'International Baccalaureate' },
  { id: 'custom', label: 'Custom', description: 'Define your own curriculum structure' },
] as const;

interface CurriculumFrameworkStepProps {
  onNext: (frameworkId: string) => Promise<void>;
  onBack: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export function CurriculumFrameworkStep({
  onNext,
  onBack,
  onSkip,
  isLoading,
}: CurriculumFrameworkStepProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (selected) onNext(selected);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <BookMarked className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Choose your curriculum framework</h2>
        <p className="text-sm text-muted-foreground">
          This helps us align assessments and content to your standards.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {FRAMEWORKS.map((fw) => (
          <button
            key={fw.id}
            type="button"
            onClick={() => setSelected(fw.id)}
            className={cn(
              'rounded-xl border p-4 text-left transition-colors',
              selected === fw.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40',
            )}
          >
            <p className="font-medium">{fw.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{fw.description}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={onBack} disabled={isLoading} className="w-full sm:w-auto">
          Back
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={isLoading} className="w-full sm:w-auto">
          Skip for now
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading || !selected}
          className="w-full sm:flex-1"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
