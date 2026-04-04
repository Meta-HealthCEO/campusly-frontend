'use client';

import { useState } from 'react';
import { BookOpen, GraduationCap, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GRADE_LEVELS } from '@/lib/constants';

const SA_SUBJECTS = [
  'Mathematics', 'English', 'Afrikaans', 'Life Sciences', 'Physical Sciences',
  'Natural Sciences', 'Social Sciences', 'Economic Management Sciences',
  'Technology', 'Life Orientation', 'Geography', 'History',
  'Accounting', 'Business Studies', 'Creative Arts', 'isiZulu', 'isiXhosa',
] as const;

interface GradesSubjectsStepProps {
  onNext: (grades: string[], subjects: string[]) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export function GradesSubjectsStep({ onNext, onBack, isLoading }: GradesSubjectsStepProps) {
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade],
    );
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
    );
  };

  const canProceed = selectedGrades.length > 0 && selectedSubjects.length > 0;

  return (
    <div className="space-y-6">
      {/* Grades */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <GraduationCap className="h-4 w-4 text-[#2563EB]" />
          Which grades do you teach?
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {GRADE_LEVELS.map((grade) => {
            const selected = selectedGrades.includes(grade);
            return (
              <button
                key={grade}
                type="button"
                onClick={() => toggleGrade(grade)}
                className={`relative flex items-center justify-center rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] font-medium'
                    : 'border-input hover:bg-muted'
                }`}
              >
                {selected && <Check className="absolute left-2 h-3 w-3" />}
                {grade}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedGrades.length} grade{selectedGrades.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Subjects */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-[#2563EB]" />
          Which subjects do you teach?
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SA_SUBJECTS.map((subject) => {
            const selected = selectedSubjects.includes(subject);
            return (
              <button
                key={subject}
                type="button"
                onClick={() => toggleSubject(subject)}
                className={`relative flex items-center justify-center rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB] font-medium'
                    : 'border-input hover:bg-muted'
                }`}
              >
                {selected && <Check className="absolute left-2 h-3 w-3" />}
                <span className="truncate">{subject}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="h-10 w-full sm:w-auto">
          Back
        </Button>
        <Button
          type="button"
          disabled={!canProceed || isLoading}
          onClick={() => onNext(selectedGrades, selectedSubjects)}
          className="h-10 w-full sm:flex-1 bg-[#2563EB] hover:bg-[#1d4ed8]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating grades & subjects...
            </>
          ) : (
            'Next: Add Students'
          )}
        </Button>
      </div>
    </div>
  );
}
