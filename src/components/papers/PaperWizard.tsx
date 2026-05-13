'use client';

import { useState } from 'react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Button } from '@/components/ui/button';
import type { AIPaperSectionConfig } from '@/types/papers';
import { PaperWizardStep1, type PaperMetadataState } from './PaperWizardStep1';
import { PaperWizardAIConfig } from './PaperWizardAIConfig';
import { PaperWizardManualConfig } from './PaperWizardManualConfig';

interface Props {
  onComplete: (paperId: string) => void;
  onCancel: () => void;
}

interface ManualSectionInput {
  title: string;
  instructions?: string;
  questions: [];
}

const INITIAL_METADATA: PaperMetadataState = {
  title: '',
  subjectId: '',
  gradeId: '',
  topicIds: [],
  term: 1,
  year: new Date().getFullYear(),
  paperType: 'class_test',
  duration: 60,
  totalMarks: 50,
  difficulty: 'medium',
};

const PAPER_TYPE_LABELS: Record<PaperMetadataState['paperType'], string> = {
  class_test: 'Class Test',
  assignment: 'Assignment',
  mid_year: 'Mid-Year Exam',
  trial: 'Trial Exam',
  final: 'Final Exam',
  custom: 'Paper',
};

function titleFor(metadata: PaperMetadataState): string {
  const explicitTitle = metadata.title.trim();
  if (explicitTitle) return explicitTitle;
  return `Term ${metadata.term} ${PAPER_TYPE_LABELS[metadata.paperType]} ${metadata.year}`;
}

export function PaperWizard({ onComplete, onCancel }: Props) {
  const { generatePaperWithAI, createPaperManual } = useTeacherPapers(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [metadata, setMetadata] = useState<PaperMetadataState>(INITIAL_METADATA);

  const handleMetadataChange = (patch: Partial<PaperMetadataState>): void => {
    setMetadata((prev: PaperMetadataState) => ({ ...prev, ...patch }));
  };

  const handleAIGenerate = async (
    sectionConfig: AIPaperSectionConfig[],
  ): Promise<void> => {
    const result = await generatePaperWithAI({
      ...metadata,
      title: titleFor(metadata),
      sectionConfig,
    });
    if (result?.paperId) onComplete(result.paperId);
  };

  const handleManualCreate = async (
    sections: ManualSectionInput[],
  ): Promise<void> => {
    const paper = await createPaperManual({
      ...metadata,
      title: titleFor(metadata),
      sections,
    });
    if (paper?._id) onComplete(paper._id);
  };

  if (step === 1) {
    return (
      <PaperWizardStep1
        value={metadata}
        onChange={handleMetadataChange}
        onCancel={onCancel}
        onNext={() => setStep(2)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Generate Paper</h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant={mode === 'ai' ? 'default' : 'outline'}
          onClick={() => setMode('ai')}
        >
          AI Generated
        </Button>
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          onClick={() => setMode('manual')}
        >
          Build Manually
        </Button>
      </div>

      {mode === 'ai' && (
        <PaperWizardAIConfig
          totalMarks={metadata.totalMarks}
          onGenerate={handleAIGenerate}
        />
      )}
      {mode === 'manual' && (
        <PaperWizardManualConfig onCreate={handleManualCreate} />
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4">
        <Button variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
