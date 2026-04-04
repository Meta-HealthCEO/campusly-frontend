'use client';

import { useState, useMemo, useCallback } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ImageDropzone } from '@/components/ai-tools/ImageDropzone';
import { NodePicker } from '@/components/curriculum';
import { ExtractedQuestionsList } from './ExtractedQuestionsList';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import type {
  ExtractFromPaperPayload,
  ExtractedQuestionItem,
  CreateQuestionPayload,
} from '@/types/question-bank';
import type { CurriculumNodeItem } from '@/types/curriculum-structure';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SelectOption { id: string; name: string }

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

type Step = 'upload' | 'extracting' | 'review' | 'saving';

interface UploadPaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: SelectOption[];
  grades: SelectOption[];
  frameworkId: string;
  onSearch: (fwId: string, search: string, filterType?: string) => Promise<CurriculumNodeItem[]>;
  onLoadNode: (id: string) => Promise<CurriculumNodeItem>;
  onExtract: (payload: ExtractFromPaperPayload) => Promise<ExtractedQuestionItem[]>;
  onSaveQuestions: (questions: CreateQuestionPayload[]) => Promise<void>;
  onComplete: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function UploadPaperDialog({
  open, onOpenChange, subjects, grades, frameworkId,
  onSearch, onLoadNode, onExtract, onSaveQuestions, onComplete,
}: UploadPaperDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState<ImageMediaType>('image/jpeg');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedQuestionItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const subjectName = useMemo(
    () => subjects.find((s) => s.id === subjectId)?.name ?? '',
    [subjectId, subjects],
  );
  const gradeName = useMemo(
    () => grades.find((g) => g.id === gradeId)?.name ?? '',
    [gradeId, grades],
  );

  const canExtract = imageBase64 && subjectId && gradeId && nodeId;

  const resetState = useCallback(() => {
    setStep('upload');
    setImageBase64(null);
    setExtracted([]);
    setSelected(new Set());
  }, []);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  }, [onOpenChange, resetState]);

  const handleImageSelected = useCallback((base64: string, mediaType: ImageMediaType) => {
    setImageBase64(base64);
    setImageType(mediaType);
  }, []);

  const handleNodeChange = useCallback((_id: string | null, _node: CurriculumNodeItem | null) => {
    setNodeId(_id);
  }, []);

  const handleExtract = async () => {
    if (!imageBase64 || !subjectId || !gradeId) return;
    setStep('extracting');
    try {
      const questions = await onExtract({
        image: imageBase64,
        imageType,
        subjectId,
        gradeId,
      });
      setExtracted(questions);
      setSelected(new Set(questions.map((_: ExtractedQuestionItem, i: number) => i)));
      setStep('review');
      if (questions.length === 0) {
        toast.info('No questions could be extracted from this image. Try a clearer photo.');
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to extract questions'));
      setStep('upload');
    }
  };

  const toggleQuestion = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!nodeId) return;
    const questionsToSave = extracted
      .filter((_: ExtractedQuestionItem, i: number) => selected.has(i))
      .map((q: ExtractedQuestionItem): CreateQuestionPayload => ({
        curriculumNodeId: nodeId,
        subjectId,
        gradeId,
        type: q.type,
        stem: q.stem,
        options: q.options.length > 0 ? q.options : undefined,
        answer: q.answer || undefined,
        markingRubric: q.markingRubric || undefined,
        marks: q.marks,
        cognitiveLevel: { caps: q.capsLevel, blooms: 'remember' },
        difficulty: q.difficulty,
      }));

    if (questionsToSave.length === 0) {
      toast.error('Select at least one question to save');
      return;
    }

    setStep('saving');
    try {
      await onSaveQuestions(questionsToSave);
      toast.success(`Saved ${questionsToSave.length} question${questionsToSave.length !== 1 ? 's' : ''}`);
      onComplete();
      handleOpenChange(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save questions'));
      setStep('review');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload Paper
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a photo of an exam paper and AI will extract the questions.'}
            {step === 'extracting' && 'Analyzing the paper image...'}
            {step === 'review' && `Found ${extracted.length} question${extracted.length !== 1 ? 's' : ''}. Select which to save.`}
            {step === 'saving' && 'Saving questions to the bank...'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Upload step */}
          {(step === 'upload' || step === 'extracting') && (
            <UploadStepFields
              imageBase64={imageBase64}
              imageType={imageType}
              subjectId={subjectId}
              gradeId={gradeId}
              nodeId={nodeId}
              subjects={subjects}
              grades={grades}
              frameworkId={frameworkId}
              subjectName={subjectName}
              gradeName={gradeName}
              onImageSelected={handleImageSelected}
              onImageClear={() => setImageBase64(null)}
              onSubjectChange={setSubjectId}
              onGradeChange={setGradeId}
              onNodeChange={handleNodeChange}
              onSearch={onSearch}
              onLoadNode={onLoadNode}
            />
          )}

          {step === 'extracting' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                AI is reading the paper and extracting questions...
              </p>
            </div>
          )}

          {step === 'review' && (
            <ExtractedQuestionsList
              questions={extracted}
              selected={selected}
              onToggle={toggleQuestion}
            />
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Saving questions...</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleExtract} disabled={!canExtract}>
                <Upload className="mr-2 size-4" />
                Extract Questions
              </Button>
            </>
          )}
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={resetState}>Back</Button>
              <Button onClick={handleSave} disabled={selected.size === 0}>
                <Check className="mr-2 size-4" />
                Save {selected.size} Question{selected.size !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Upload Step Fields (extracted to keep main component smaller) ───────

interface UploadStepFieldsProps {
  imageBase64: string | null;
  imageType: ImageMediaType;
  subjectId: string;
  gradeId: string;
  nodeId: string | null;
  subjects: SelectOption[];
  grades: SelectOption[];
  frameworkId: string;
  subjectName: string;
  gradeName: string;
  onImageSelected: (base64: string, mediaType: ImageMediaType) => void;
  onImageClear: () => void;
  onSubjectChange: (id: string) => void;
  onGradeChange: (id: string) => void;
  onNodeChange: (id: string | null, node: CurriculumNodeItem | null) => void;
  onSearch: (fwId: string, search: string, filterType?: string) => Promise<CurriculumNodeItem[]>;
  onLoadNode: (id: string) => Promise<CurriculumNodeItem>;
}

function UploadStepFields({
  imageBase64, imageType, subjectId, gradeId, nodeId,
  subjects, grades, frameworkId, subjectName, gradeName,
  onImageSelected, onImageClear, onSubjectChange, onGradeChange,
  onNodeChange, onSearch, onLoadNode,
}: UploadStepFieldsProps) {
  return (
    <>
      <ImageDropzone
        imagePreview={imageBase64}
        imageType={imageType}
        onImageSelected={onImageSelected}
        onClear={onImageClear}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Subject <span className="text-destructive">*</span></Label>
          <Select value={subjectId} onValueChange={(v: unknown) => onSubjectChange(v as string)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select subject">
                {subjectName || 'Select subject'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Grade <span className="text-destructive">*</span></Label>
          <Select value={gradeId} onValueChange={(v: unknown) => onGradeChange(v as string)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select grade">
                {gradeName || 'Select grade'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Curriculum Topic <span className="text-destructive">*</span></Label>
        <NodePicker
          frameworkId={frameworkId}
          value={nodeId}
          onChange={onNodeChange}
          onSearch={onSearch}
          onLoadNode={onLoadNode}
          placeholder="Select topic for extracted questions..."
          disabled={!frameworkId}
        />
      </div>
    </>
  );
}

