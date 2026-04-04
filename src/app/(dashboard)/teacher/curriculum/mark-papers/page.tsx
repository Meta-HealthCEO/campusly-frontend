'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ImageDropzone } from '@/components/ai-tools/ImageDropzone';
import { MarkingResultsPanel } from '@/components/ai-tools/MarkingResultsPanel';
import { Sparkles, Loader2, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAITools } from '@/hooks/useAITools';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import type { MarkPaperQuestionResult } from '@/hooks/useAITools';

interface AdjustedQuestion extends MarkPaperQuestionResult {
  adjustedMarks: number;
}

export default function MarkPapersPage() {
  const { user } = useAuthStore();
  const { loading: aiLoading, markPaperFromImage, loadPapers: loadAIPapers, papers: aiPapers } = useAITools();
  const { papers: qbPapers, papersLoading: qbLoading, fetchPapers: fetchQBPapers } = useQuestionBank();

  // Step tracking
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: paper selection
  const [paperSource, setPaperSource] = useState<'ai' | 'qb'>('ai');
  const [selectedPaperId, setSelectedPaperId] = useState('');

  // Step 2: student + image
  const [studentName, setStudentName] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');

  // Step 3/4: results
  const [results, setResults] = useState<{
    studentName: string;
    totalMarks: number;
    maxMarks: number;
    percentage: number;
    questions: AdjustedQuestion[];
  } | null>(null);

  // Load papers on mount
  useEffect(() => {
    loadAIPapers();
    fetchQBPapers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Combine paper lists for selection
  const allPapers = useMemo(() => {
    const mapped: Array<{ id: string; label: string; source: 'ai' | 'qb'; totalMarks: number }> = [];
    for (const p of aiPapers) {
      if (p.status !== 'generating') {
        mapped.push({
          id: p.id,
          label: `${p.subject} - Grade ${p.grade} - ${p.topic} (AI Paper)`,
          source: 'ai',
          totalMarks: p.totalMarks,
        });
      }
    }
    for (const p of qbPapers) {
      mapped.push({
        id: p.id,
        label: `${p.title} (Assessment)`,
        source: 'qb',
        totalMarks: p.totalMarks,
      });
    }
    return mapped;
  }, [aiPapers, qbPapers]);

  const selectedPaper = useMemo(
    () => allPapers.find((p) => p.id === selectedPaperId) ?? null,
    [allPapers, selectedPaperId],
  );

  const handleImageSelected = useCallback(
    (base64: string, type: 'image/jpeg' | 'image/png' | 'image/webp') => {
      setImageBase64(base64);
      setImageType(type);
    },
    [],
  );

  const handleClearImage = useCallback(() => {
    setImageBase64(null);
  }, []);

  const handleMarkPaper = useCallback(async () => {
    if (!selectedPaperId || !studentName || !imageBase64) return;

    const result = await markPaperFromImage({
      paperId: selectedPaperId,
      studentName,
      image: imageBase64,
      imageType,
    });

    if (result) {
      setResults({
        ...result,
        questions: result.questions.map((q) => ({
          ...q,
          adjustedMarks: q.marksAwarded,
        })),
      });
      setStep(4);
    }
  }, [selectedPaperId, studentName, imageBase64, imageType, markPaperFromImage]);

  const handleAdjustMark = useCallback((index: number, marks: number) => {
    setResults((prev) => {
      if (!prev) return prev;
      const updated = [...prev.questions];
      updated[index] = { ...updated[index], adjustedMarks: marks };
      return { ...prev, questions: updated };
    });
  }, []);

  const handleAcceptMarks = useCallback(() => {
    if (!results) return;
    const total = results.questions.reduce((s, q) => s + q.adjustedMarks, 0);
    toast.success(
      `Marks accepted for ${results.studentName}: ${total}/${results.maxMarks}`,
    );
  }, [results]);

  const handleMarkAnother = useCallback(() => {
    setStudentName('');
    setImageBase64(null);
    setResults(null);
    setStep(2);
  }, []);

  const isLoadingPapers = qbLoading;

  if (isLoadingPapers) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mark Papers (OCR)"
        description="Photograph handwritten answers and let AI grade them"
      >
        <Link href={ROUTES.TEACHER_CURRICULUM}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </PageHeader>

      {/* Step indicators */}
      <div className="flex gap-2 flex-wrap">
        {(['Select Paper', 'Upload Photo', 'AI Marking', 'Review'] as const).map(
          (label, idx) => (
            <Badge
              key={label}
              variant={step === idx + 1 ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (idx + 1 === 1) setStep(1);
                else if (idx + 1 === 2 && selectedPaperId) setStep(2);
              }}
            >
              {idx + 1}. {label}
            </Badge>
          ),
        )}
      </div>

      {/* Step 1: Select Paper */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Assessment Paper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Paper</Label>
              <Select
                value={selectedPaperId || 'placeholder'}
                onValueChange={(v: unknown) => {
                  const val = v as string;
                  if (val !== 'placeholder') setSelectedPaperId(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a paper to mark against..." />
                </SelectTrigger>
                <SelectContent>
                  {allPapers.length === 0 ? (
                    <SelectItem value="none" disabled>No papers available</SelectItem>
                  ) : (
                    allPapers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPaper && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm truncate">{selectedPaper.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Total marks: {selectedPaper.totalMarks}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep(2)}
              disabled={!selectedPaperId}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Student Answer Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Student Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. John Smith"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full sm:w-80"
              />
            </div>

            <div className="space-y-2">
              <Label>Photo of Answer Sheet</Label>
              <ImageDropzone
                imagePreview={imageBase64}
                onImageSelected={handleImageSelected}
                onClear={handleClearImage}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!studentName || !imageBase64}
              >
                Continue to Marking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: AI Marking */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Marking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
              <p><span className="font-medium">Paper:</span> {selectedPaper?.label}</p>
              <p><span className="font-medium">Student:</span> {studentName}</p>
            </div>

            {imageBase64 && (
              <img
                src={`data:${imageType};base64,${imageBase64}`}
                alt="Answer sheet preview"
                className="w-full max-h-48 object-contain rounded-lg border"
              />
            )}

            {aiLoading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  AI is reading and grading the answers...
                </p>
                <p className="text-xs text-muted-foreground">
                  This may take 15-30 seconds
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleMarkPaper}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Mark with AI
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review Results */}
      {step === 4 && results && (
        <MarkingResultsPanel
          studentName={results.studentName}
          totalMarks={results.totalMarks}
          maxMarks={results.maxMarks}
          percentage={results.percentage}
          questions={results.questions}
          onAdjustMark={handleAdjustMark}
          onAccept={handleAcceptMarks}
          onMarkAnother={handleMarkAnother}
        />
      )}
    </div>
  );
}
