'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Lock,
  CheckCircle2,
  PlayCircle,
  FileText,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Play,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseTree, CourseLesson, LessonProgressStatus, LessonType } from '@/types';

/**
 * A lesson as decorated by the backend's getEnrolment endpoint:
 * base CourseLesson + per-lesson progress + unlockStatus. These extras
 * are attached at runtime; TypeScript doesn't see them on CourseLesson
 * directly, so we cast at the consumer.
 */
interface LessonWithStatus extends CourseLesson {
  progress?: { status: LessonProgressStatus; completedAt: string | null } | null;
  unlockStatus?: LessonProgressStatus;
}

interface CourseHomeProps {
  course: CourseTree;
  progressPercent: number;
  onOpenLesson: (lessonId: string) => void;
}

const LESSON_ICON: Record<LessonType, typeof FileText> = {
  content: FileText,
  chapter: BookOpen,
  homework: ClipboardList,
  quiz: HelpCircle,
};

function statusIcon(status: LessonProgressStatus | undefined): typeof CheckCircle2 {
  if (status === 'completed') return CheckCircle2;
  if (status === 'in_progress') return PlayCircle;
  if (status === 'locked') return Lock;
  return PlayCircle;
}

function findNextAvailableLesson(course: CourseTree): LessonWithStatus | null {
  for (const mod of course.modules) {
    for (const lesson of mod.lessons as LessonWithStatus[]) {
      const status = lesson.unlockStatus;
      if (status === 'available' || status === 'in_progress') return lesson;
    }
  }
  return null;
}

/**
 * Student course home page. Shows hero + description + progress bar +
 * collapsible module/lesson outline with lock icons and completion
 * ticks. The Continue button jumps to the next available lesson.
 */
export function CourseHome({ course, progressPercent, onOpenLesson }: CourseHomeProps) {
  const nextLesson = findNextAvailableLesson(course);
  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const completedLessons = course.modules.reduce((n, m) => {
    return n + (m.lessons as LessonWithStatus[]).filter(
      (l) => l.unlockStatus === 'completed',
    ).length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden">
        {course.coverImageUrl && (
          <div className="h-48 w-full bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              {course.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {course.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {course.gradeLevel !== null && (
                  <Badge variant="outline">Grade {course.gradeLevel}</Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {totalLessons} lessons
                </Badge>
                {course.estimatedDurationHours !== null && (
                  <Badge variant="outline">~{course.estimatedDurationHours} hours</Badge>
                )}
              </div>
            </div>
            {nextLesson && (
              <Button
                size="lg"
                className="shrink-0 w-full sm:w-auto"
                onClick={() => onOpenLesson(nextLesson.id)}
              >
                <Play className="mr-2 h-4 w-4" />
                {completedLessons === 0 ? 'Start learning' : 'Continue'}
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {completedLessons} of {totalLessons} lessons completed
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module outline */}
      <div className="space-y-3">
        {course.modules.map((mod) => (
          <ModuleCard
            key={mod.id}
            module={mod}
            onOpenLesson={onOpenLesson}
          />
        ))}
      </div>
    </div>
  );
}

interface ModuleCardProps {
  module: CourseTree['modules'][number];
  onOpenLesson: (lessonId: string) => void;
}

function ModuleCard({ module, onOpenLesson }: ModuleCardProps) {
  const [expanded, setExpanded] = useState(true);
  const lessons = module.lessons as LessonWithStatus[];
  const completedCount = lessons.filter((l) => l.unlockStatus === 'completed').length;

  return (
    <Card>
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <h3 className="flex-1 font-semibold">{module.title}</h3>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{lessons.length}
          </span>
        </button>
        {expanded && (
          <div className="mt-3 space-y-1 pl-6">
            {lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                onOpenLesson={onOpenLesson}
              />
            ))}
            {lessons.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-2 py-1">
                No lessons in this module yet.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface LessonRowProps {
  lesson: LessonWithStatus;
  onOpenLesson: (lessonId: string) => void;
}

function LessonRow({ lesson, onOpenLesson }: LessonRowProps) {
  const status = lesson.unlockStatus ?? 'locked';
  const isLocked = status === 'locked';
  const Icon = LESSON_ICON[lesson.type];
  const StatusIcon = statusIcon(status);

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => !isLocked && onOpenLesson(lesson.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-sm text-left transition-colors',
        isLocked
          ? 'border-transparent text-muted-foreground cursor-not-allowed'
          : 'hover:bg-muted/50',
        status === 'completed' && 'text-muted-foreground',
      )}
    >
      <StatusIcon
        className={cn(
          'h-4 w-4 shrink-0',
          status === 'completed' ? 'text-emerald-500' :
          status === 'in_progress' ? 'text-primary' :
          isLocked ? 'text-muted-foreground' : 'text-primary',
        )}
      />
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{lesson.title}</span>
    </button>
  );
}
