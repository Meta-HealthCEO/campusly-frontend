'use client';

import { useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SA_SUBJECTS = [
  'Mathematics', 'English', 'Afrikaans', 'Life Sciences',
  'Physical Sciences', 'Geography', 'History', 'Business Studies',
  'Accounting', 'Economics', 'Life Orientation', 'Technology',
  'Natural Sciences', 'Social Sciences', 'Creative Arts', 'EMS',
  'Computer Applications',
] as const;

interface WelcomeSubjectsStepProps {
  onNext: (subjects: string[]) => Promise<void>;
  onSkip: () => void;
  isLoading: boolean;
}

export function WelcomeSubjectsStep({ onNext, onSkip, isLoading }: WelcomeSubjectsStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (subject: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  const handleContinue = () => {
    onNext(Array.from(selected));
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Welcome! What do you teach?</h2>
        <p className="text-sm text-muted-foreground">
          Select the subjects you teach so we can personalise your experience.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {SA_SUBJECTS.map((subject) => (
          <button key={subject} type="button" onClick={() => toggle(subject)}>
            <Badge
              variant={selected.has(subject) ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5 text-sm"
            >
              {subject}
            </Badge>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
          Skip for now
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isLoading || selected.size === 0}
          className="min-w-[140px]"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
