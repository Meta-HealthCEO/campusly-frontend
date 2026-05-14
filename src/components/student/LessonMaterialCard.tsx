'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText, BookOpen, Sparkles, ClipboardList, Pencil,
  ExternalLink, GraduationCap, Library, ChevronRight, FileSpreadsheet,
} from 'lucide-react';
import type { StudentLessonMaterial, StudentLessonMaterialKind } from '@/types';
import { QuizPlayer } from '@/components/learning/QuizPlayer';

const KIND_ICON: Record<StudentLessonMaterialKind, typeof FileText> = {
  reading: BookOpen,
  study_notes: FileText,
  worked_example: GraduationCap,
  worksheet: Pencil,
  activity: Pencil,
  quiz: Sparkles,
  practice_questions: Sparkles,
  homework: ClipboardList,
  paper: FileSpreadsheet,
};

const KIND_LABEL: Record<StudentLessonMaterialKind, string> = {
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

// Tailwind color tokens per kind. Uses bg-*-500/10 + text-*-600 dark:text-*-400.
const KIND_ACCENT: Record<StudentLessonMaterialKind, string> = {
  reading: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  study_notes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  worked_example: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  worksheet: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
  activity: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
  quiz: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  practice_questions: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  homework: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  paper: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

interface CardShellProps {
  material: StudentLessonMaterial;
  accentClass: string;
  label: string;
  Icon: typeof FileText;
  children: React.ReactNode;
}

function CardShell({ material, accentClass, label, Icon, children }: CardShellProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={['flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', accentClass].join(' ')}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{label}</Badge>
              {material.phase && (
                <span className="text-xs text-muted-foreground">{material.phase}</span>
              )}
            </div>
            <h4 className="text-base font-semibold leading-snug line-clamp-2">{material.title}</h4>
            {material.teacherNotes && (
              <p className="text-xs text-muted-foreground line-clamp-2">{material.teacherNotes}</p>
            )}
            {material.textbookRef && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Library className="h-3 w-3" />
                <span>{material.textbookRef.title ?? 'Textbook'}</span>
                {material.textbookRef.pageStart !== undefined &&
                  material.textbookRef.pageEnd !== undefined && (
                    <span>
                      - pages {material.textbookRef.pageStart}-{material.textbookRef.pageEnd}
                    </span>
                  )}
              </p>
            )}
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ClickableCardProps extends CardShellProps {
  href: string;
}

function ClickableCard({ href, ...rest }: ClickableCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative transition-colors hover:bg-muted/40 rounded-xl">
        <CardShell {...rest}>
          {rest.children}
        </CardShell>
        <ChevronRight className="absolute top-1/2 right-5 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function LessonMaterialCard({
  material,
  lessonId,
}: {
  material: StudentLessonMaterial;
  lessonId: string;
}) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const Icon = KIND_ICON[material.kind] ?? FileText;
  const label = KIND_LABEL[material.kind] ?? material.kind;
  const accentClass = KIND_ACCENT[material.kind] ?? 'bg-primary/10 text-primary';

  const isReadable = (['reading', 'study_notes', 'worked_example'] as const).some((k) => k === material.kind);
  const isWorksheet = (['worksheet', 'activity'] as const).some((k) => k === material.kind);
  const isQuiz = (['quiz', 'practice_questions'] as const).some((k) => k === material.kind);
  const hasContentBlocks = (material.contentResource?.blocks?.length ?? 0) > 0;

  // Quiz materials: open in a Dialog with QuizPlayer (own action, not navigation)
  if (isQuiz && material.quiz) {
    return (
      <>
        <CardShell material={material} accentClass={accentClass} label={label} Icon={Icon}>
          <div className="pt-1">
            <Button size="sm" onClick={() => setPlayerOpen(true)}>
              {material.kind === 'practice_questions' ? 'Practice' : 'Start quiz'}
            </Button>
          </div>
        </CardShell>
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
      </>
    );
  }

  // Worksheet without content blocks: external download link (own action)
  if (isWorksheet && material.contentResource?.url && !hasContentBlocks) {
    return (
      <CardShell material={material} accentClass={accentClass} label={label} Icon={Icon}>
        <div className="pt-1">
          <a href={material.contentResource.url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Download
            </Button>
          </a>
        </div>
      </CardShell>
    );
  }

  // Readable + worksheet-with-blocks: navigate to the full-page material view
  if ((isReadable && material.contentResource) || (isWorksheet && material.contentResource && hasContentBlocks)) {
    return (
      <ClickableCard
        material={material}
        accentClass={accentClass}
        label={label}
        Icon={Icon}
        href={`/student/lessons/${lessonId}/materials/${material.id}`}
      >
        {null}
      </ClickableCard>
    );
  }

  // Homework: navigate to homework detail with from=lesson backlink
  if (material.kind === 'homework' && material.homework) {
    return (
      <ClickableCard
        material={material}
        accentClass={accentClass}
        label={label}
        Icon={Icon}
        href={`/student/homework/${material.homework.id}?from=lesson:${lessonId}`}
      >
        {null}
      </ClickableCard>
    );
  }

  // Paper: navigate to test detail with from=lesson backlink
  if (material.kind === 'paper' && material.paper) {
    return (
      <ClickableCard
        material={material}
        accentClass={accentClass}
        label={label}
        Icon={Icon}
        href={`/student/tests/${material.paper.paperId}?from=lesson:${lessonId}`}
      >
        {null}
      </ClickableCard>
    );
  }

  // Fallback: render card with no action (e.g. material with no attached resource yet)
  return (
    <CardShell material={material} accentClass={accentClass} label={label} Icon={Icon}>
      {null}
    </CardShell>
  );
}
