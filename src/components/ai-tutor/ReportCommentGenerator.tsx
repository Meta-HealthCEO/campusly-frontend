'use client';

import { useState, useMemo, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportCommentCard } from './ReportCommentCard';
import type { ReportCommentPayload, SchoolClass, Subject, Student } from '@/types';

interface ReportCommentGeneratorProps {
  onGenerate: (payload: ReportCommentPayload) => void;
  onLoadComments: (filters: { classId?: string; subjectId?: string; term?: number }) => void;
  onUpdateComment: (id: string, finalText: string) => Promise<unknown>;
  onUpdateCommentLocal: (studentId: string, text: string) => void;
  onRegenerate: (id: string, wasEdited: boolean) => void;
  onDelete: (id: string) => void;
  comments: import('@/types').ReportComment[];
  generating: boolean;
  classes: SchoolClass[];
  subjects: Subject[];
  students: Student[];
}

const TONES = [
  { value: 'formal', label: 'Formal' },
  { value: 'encouraging', label: 'Encouraging' },
  { value: 'balanced', label: 'Balanced' },
] as const;

const TERMS = [
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
  { value: '4', label: 'Term 4' },
] as const;

export function ReportCommentGenerator({
  onGenerate,
  onLoadComments,
  onUpdateComment,
  onUpdateCommentLocal,
  onRegenerate,
  onDelete,
  comments,
  generating,
  classes,
  subjects,
  students,
}: ReportCommentGeneratorProps) {
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [term, setTerm] = useState('1');
  const [tone, setTone] = useState<'formal' | 'encouraging' | 'balanced'>('balanced');

  const classStudents = useMemo(
    () => students.filter((s) => s.classId === classId),
    [students, classId],
  );

  // Hydrate saved comments whenever class/subject/term changes
  useEffect(() => {
    if (classId && subjectId) {
      onLoadComments({ classId, subjectId, term: parseInt(term, 10) });
    }
  }, [classId, subjectId, term, onLoadComments]);

  const handleGenerate = () => {
    if (!classId || !subjectId) return;
    onGenerate({
      classId,
      subjectId,
      term,
      tone,
      studentIds: classStudents.map((s) => s.id),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Report Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Class <span className="text-destructive">*</span></Label>
              <Select value={classId} onValueChange={(v: unknown) => setClassId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.gradeName ? `${c.gradeName} - ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={subjectId} onValueChange={(v: unknown) => setSubjectId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Term</Label>
              <Select value={term} onValueChange={(v: unknown) => setTerm(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select
                value={tone}
                onValueChange={(v: unknown) => setTone(v as 'formal' | 'encouraging' | 'balanced')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || !classId || !subjectId}
            className="w-full sm:w-auto"
          >
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Generate Comments</>
            )}
          </Button>
        </CardContent>
      </Card>

      {comments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">
            {comments.length === 1 ? '1 Comment' : `${comments.length} Comments`}
          </h3>
          {comments.map((c) => (
            <ReportCommentCard
              key={c.id || c.studentId}
              comment={c}
              onTextChange={onUpdateCommentLocal}
              onSave={onUpdateComment}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
