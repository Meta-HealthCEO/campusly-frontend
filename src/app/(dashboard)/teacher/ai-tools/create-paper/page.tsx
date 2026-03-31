'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAITools } from '@/hooks/useAITools';
import { PaperPreview } from '@/components/ai-tools/PaperPreview';
import {
  StepIndicator,
  StepBasicInfo,
  StepConfig,
  StepSections,
  GeneratingAnimation,
} from '@/components/ai-tools/PaperWizardSteps';
import type { GeneratedPaper, SectionConfig, PaperSection } from '@/components/ai-tools/types';

export default function CreatePaperPage() {
  const { user } = useAuthStore();
  const { generatePaper, savePaper, regenerateQuestion } = useAITools();

  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [saving, setSaving] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [term, setTerm] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('60');
  const [totalMarks, setTotalMarks] = useState('50');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [sections, setSections] = useState<SectionConfig[]>([
    { id: '1', type: 'Multiple Choice (MCQ)', marks: 10, questionCount: 5 },
    { id: '2', type: 'Short Answer', marks: 15, questionCount: 4 },
    { id: '3', type: 'Long Answer', marks: 25, questionCount: 2 },
  ]);

  const addSection = () => {
    setSections([...sections, {
      id: Date.now().toString(),
      type: 'Short Answer',
      marks: 10,
      questionCount: 3,
    }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: keyof SectionConfig, value: string | number) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleGenerate = async () => {
    if (!user?.schoolId) return;
    setGenerating(true);
    setError(null);
    setStep(4);
    const result = await generatePaper({
      schoolId: user.schoolId,
      subject,
      grade: Number(grade),
      term: Number(term),
      topic,
      difficulty,
      duration: Number(duration),
      totalMarks: Number(totalMarks),
    });
    setGenerating(false);
    if (result) {
      setPaper(result);
      setStep(5);
    } else {
      setError('Failed to generate paper. Please try again.');
      setStep(3);
    }
  };

  const handleRegenerateQuestion = useCallback(async (
    sectionIndex: number, questionIndex: number,
  ) => {
    if (!paper) return;
    setRegeneratingKey(`${sectionIndex}:${questionIndex}`);
    const updated = await regenerateQuestion(paper.id, sectionIndex, questionIndex);
    if (updated) setPaper(updated);
    setRegeneratingKey(null);
  }, [paper, regenerateQuestion]);

  const handleEditQuestion = useCallback((
    sectionIndex: number, questionIndex: number, text: string,
  ) => {
    if (!paper) return;
    const newSections = paper.sections.map((sec, sIdx) => {
      if (sIdx !== sectionIndex) return sec;
      return {
        ...sec,
        questions: sec.questions.map((q, qIdx) =>
          qIdx === questionIndex ? { ...q, questionText: text } : q,
        ),
      };
    });
    setPaper({ ...paper, sections: newSections });
  }, [paper]);

  const handleSave = useCallback(async (updatedSections: PaperSection[]) => {
    if (!paper) return;
    setSaving(true);
    await savePaper(paper.id, { sections: updatedSections });
    setSaving(false);
  }, [paper, savePaper]);

  const canProceed = () => {
    if (step === 1) return subject && grade && term && topic;
    if (step === 2) return duration && totalMarks && difficulty;
    if (step === 3) return sections.length > 0;
    return true;
  };

  const sectionMarksTotal = sections.reduce((sum, s) => sum + s.marks, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Create Paper" description="Generate an exam paper with AI">
        <Link href={ROUTES.TEACHER_AI_TOOLS}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to AI Tools
          </Button>
        </Link>
      </PageHeader>

      {!generating && step < 5 && (
        <StepIndicator step={step} generated={!!paper} />
      )}

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <StepBasicInfo
          subject={subject} setSubject={setSubject}
          grade={grade} setGrade={setGrade}
          term={term} setTerm={setTerm}
          topic={topic} setTopic={setTopic}
          canProceed={!!canProceed()} onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepConfig
          duration={duration} setDuration={setDuration}
          totalMarks={totalMarks} setTotalMarks={setTotalMarks}
          difficulty={difficulty} setDifficulty={setDifficulty}
          canProceed={!!canProceed()} onBack={() => setStep(1)} onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepSections
          sections={sections} totalMarks={totalMarks}
          sectionMarksTotal={sectionMarksTotal}
          addSection={addSection} removeSection={removeSection}
          updateSection={updateSection}
          onBack={() => setStep(2)} onGenerate={handleGenerate}
        />
      )}

      {step === 4 && generating && (
        <GeneratingAnimation
          subject={subject} grade={grade} term={term}
          topic={topic} difficulty={difficulty}
        />
      )}

      {step === 5 && paper && (
        <PaperPreview
          paper={paper} regeneratingKey={regeneratingKey}
          saving={saving} onEditQuestion={handleEditQuestion}
          onRegenerateQuestion={handleRegenerateQuestion}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
