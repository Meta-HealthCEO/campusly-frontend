'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Lock,
  CheckCircle2,
  PlayCircle,
  Circle,
  FileText,
  BookOpen,
  ClipboardList,
  HelpCircle,
} from 'lucide-react';
import type { CourseTree, CourseLesson, LessonProgressStatus, LessonType } from '@/types';

interface LessonWithStatus extends CourseLesson {
  unlockStatus?: LessonProgressStatus;
}

interface LessonOutlineSidebarProps {
  course: CourseTree;
  currentLessonId: string;
  onSelectLesson: (lessonId: string) => void;
}

const LESSON_ICON: Record<LessonType, typeof FileText> = {
  content: FileText,
  chapter: BookOpen,
  homework: ClipboardList,
  quiz: HelpCircle,
};

const STATUS_ICON: Record<LessonProgressStatus, typeof CheckCircle2> = {
  completed: CheckCircle2,
  in_progress: PlayCircle,
  locked: Lock,
  available: Circle,
};

/**
 * The left sidebar in the lesson player. Shows the full course outline
 * with lock icons, completion ticks, and the current lesson highlighted.
 * Modules are collapsible; a module containing the current lesson
 * auto-expands on mount.
 */
export function LessonOutlineSidebar({
  course,
  currentLessonId,
  onSelectLesson,
}: LessonOutlineSidebarProps) {
  return (
    <div className="space-y-2 p-3">
      {course.modules.map((mod) => (
        <ModuleGroup
          key={mod.id}
          module={mod}
          currentLessonId={currentLessonId}
          onSelectLesson={onSelectLesson}
        />
      ))}
    </div>
  );
}

interface ModuleGroupProps {
  module: CourseTree['modules'][number];
  currentLessonId: string;
  onSelectLesson: (lessonId: string) => void;
}

function ModuleGroup({ module, currentLessonId, onSelectLesson }: ModuleGroupProps) {
  const containsCurrent = module.lessons.some((l) => l.id === currentLessonId);
  const [expanded, setExpanded] = useState(containsCurrent);
  const lessons = module.lessons as LessonWithStatus[];
  const completed = lessons.filter((l) => l.unlockStatus === 'completed').length;

  return (
    <div className="rounded-md border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate text-xs font-semibold">{module.title}</span>
        <span className="text-[10px] text-muted-foreground">
          {completed}/{lessons.length}
        </span>
      </button>
      {expanded && (
        <div className="border-t px-1 py-1 space-y-0.5">
          {lessons.map((lesson) => (
            <LessonButton
              key={lesson.id}
              lesson={lesson}
              isCurrent={lesson.id === currentLessonId}
              onSelect={() => onSelectLesson(lesson.id)}
            />
          ))}
          {lessons.length === 0 && (
            <p className="text-[10px] italic text-muted-foreground px-2 py-1">
              No lessons
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface LessonButtonProps {
  lesson: LessonWithStatus;
  isCurrent: boolean;
  onSelect: () => void;
}

function LessonButton({ lesson, isCurrent, onSelect }: LessonButtonProps) {
  const status: LessonProgressStatus = lesson.unlockStatus ?? 'locked';
  const isLocked = status === 'locked';
  const TypeIcon = LESSON_ICON[lesson.type];
  const StatusIcon = STATUS_ICON[status];

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={() => !isLocked && onSelect()}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
        isCurrent ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/50',
        isLocked && 'text-muted-foreground cursor-not-allowed',
      )}
    >
      <StatusIcon
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          status === 'completed'
            ? 'text-emerald-500'
            : status === 'in_progress'
              ? 'text-primary'
              : 'text-muted-foreground',
        )}
      />
      <TypeIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{lesson.title}</span>
    </button>
  );
}
