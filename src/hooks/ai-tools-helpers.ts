/**
 * Shared helpers and types for useAITools hook.
 * Extracted to keep useAITools.ts under the 350-line limit.
 */

import type { GeneratedPaper, GradingJob } from '@/components/ai-tools/types';

export interface RubricTemplate {
  id: string;
  name: string;
  description?: string;
  criteria: Array<{ criterion: string; maxScore: number; description: string }>;
  isShared: boolean;
  teacherId: string;
}

export interface MarkPaperQuestionResult {
  questionNumber: number;
  studentAnswer: string;
  correctAnswer: string;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
}

export interface MarkPaperResult {
  studentName: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  questions: MarkPaperQuestionResult[];
}

export interface MarkPaperPayload {
  paperId: string;
  studentName: string;
  image: string;
  imageType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
}

export function mapPaper(raw: Record<string, unknown>): GeneratedPaper {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as GeneratedPaper;
}

export function mapJob(raw: Record<string, unknown>): GradingJob {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as GradingJob;
}

export function extractApiError(err: unknown, fallback: string): string {
  type ErrShape = { response?: { data?: { error?: string; message?: string } } };
  return (
    (err as ErrShape)?.response?.data?.error ??
    (err as ErrShape)?.response?.data?.message ??
    fallback
  );
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
