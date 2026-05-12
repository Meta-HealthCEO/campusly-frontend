'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText, BookOpen, Sparkles, ClipboardList, Pencil,
  ExternalLink, GraduationCap, Library,
} from 'lucide-react';
import type { StudentLessonMaterial } from '@/types';
import { LessonResourceReader } from './LessonResourceReader';
import { QuizPlayer } from '@/components/learning/QuizPlayer';

const KIND_ICON: Record<StudentLessonMaterial['kind'], typeof FileText> = {
  reading: BookOpen,
  study_notes: FileText,
  worked_example: GraduationCap,
  worksheet: Pencil,
  activity: Pencil,
  quiz: Sparkles,
  practice_questions: Sparkles,
  homework: ClipboardList,
  paper: ClipboardList,
};

const KIND_LABEL: Record<StudentLessonMaterial['kind'], string> = {
  reading: 'Reading',
  study_notes: 'Notes',
  worked_example: 'Worked example',
  worksheet: 'Worksheet',
  activity: 'Activity',
  quiz: 'Quiz',
  practice_questions: 'Practice',
  homework: 'Homework',
  paper: 'Test paper',
};

export function LessonMaterialCard({
  material,
  lessonId,
}: {
  material: StudentLessonMaterial;
  lessonId: string;
}) {
  const [readerOpen, setReaderOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const Icon = KIND_ICON[material.kind] ?? FileText;
  const label = KIND_LABEL[material.kind] ?? material.kind;

  const isReadable = (['reading', 'study_notes', 'worked_example'] as const).some((k) => k === material.kind);
  const isWorksheet = (['worksheet', 'activity'] as const).some((k) => k === material.kind);
  const isQuiz = (['quiz', 'practice_questions'] as const).some((k) => k === material.kind);

  return (
    <>
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{label}</Badge>
              {material.phase && <span className="text-xs text-muted-foreground">{material.phase}</span>}
            </div>
            <h4 className="text-sm font-medium truncate">{material.title}</h4>
            {material.teacherNotes && (
              <p className="text-xs text-muted-foreground line-clamp-2">{material.teacherNotes}</p>
            )}
            {material.textbookRef && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Library className="h-3 w-3" />
                {material.textbookRef.title ?? 'Textbook'}
                {material.textbookRef.pageStart !== undefined &&
                  material.textbookRef.pageEnd !== undefined &&
                  ` · pages ${material.textbookRef.pageStart}–${material.textbookRef.pageEnd}`}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {isReadable && material.contentResource && (
                <Button size="sm" onClick={() => setReaderOpen(true)}>Open</Button>
              )}
              {isWorksheet && material.contentResource?.url && (
                <a href={material.contentResource.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Download
                  </Button>
                </a>
              )}
              {isQuiz && material.quiz && (
                <Button size="sm" onClick={() => setPlayerOpen(true)}>
                  {material.kind === 'practice_questions' ? 'Practice' : 'Start quiz'}
                </Button>
              )}
              {material.kind === 'homework' && material.homework && (
                <Link href={`/student/homework/${material.homework.id}?from=lesson:${lessonId}`}>
                  <Button size="sm" variant="outline">Open homework</Button>
                </Link>
              )}
              {material.kind === 'paper' && material.paper && (
                <Link href={`/student/tests/${material.paper.paperId}?from=lesson:${lessonId}`}>
                  <Button size="sm" variant="outline">Open test</Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <LessonResourceReader open={readerOpen} onOpenChange={setReaderOpen} material={material} />

      {isQuiz && material.quiz && (
        <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
          <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="truncate">{material.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-2">
              <QuizPlayer
                quizId={material.quiz.id}
                mode={material.kind === 'practice_questions' ? 'practice' : 'scored'}
                onComplete={() => setPlayerOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
