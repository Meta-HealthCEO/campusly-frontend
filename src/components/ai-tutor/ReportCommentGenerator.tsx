'use client';

import { useState, useMemo } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { ReportComment, ReportCommentPayload, SchoolClass, Subject, Student } from '@/types';

interface ReportCommentGeneratorProps {
  onGenerate: (payload: ReportCommentPayload) => void;
  comments: ReportComment[];
  generating: boolean;
  onUpdateComment: (studentId: string, comment: string) => void;
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
  comments,
  generating,
  onUpdateComment,
  classes,
  subjects,
  students,
}: ReportCommentGeneratorProps) {
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [term, setTerm] = useState('1');
  const [tone, setTone] = useState<'formal' | 'encouraging' | 'balanced'>('balanced');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const classStudents = useMemo(
    () => students.filter((s) => s.classId === classId),
    [students, classId],
  );

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

  const handleCopy = async (studentId: string, comment: string) => {
    await navigator.clipboard.writeText(comment);
    setCopiedId(studentId);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
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
              <Select value={tone} onValueChange={(v: unknown) => setTone(v as 'formal' | 'encouraging' | 'balanced')}>
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
          <h3 className="text-lg font-semibold">Generated Comments ({comments.length})</h3>
          {comments.map((c) => (
            <Card key={c.studentId}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{c.studentName}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(c.studentId, c.comment)}
                  >
                    {copiedId === c.studentId ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <Copy className="mr-1 h-3 w-3" />
                    )}
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={c.comment}
                  onChange={(e) => onUpdateComment(c.studentId, e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
