'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { LessonOutlineSidebar } from './LessonOutlineSidebar';
import type { CourseTree } from '@/types';

interface LessonPlayerShellProps {
  course: CourseTree;
  currentLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  children: React.ReactNode;
}

/**
 * The two-pane lesson player layout. Outline sidebar on the left (a
 * drawer on mobile via Sheet), scrollable main pane in the middle,
 * sticky Previous/Next bottom bar. The main pane content is passed as
 * children so the page can render different UI per lesson type
 * (BlockRenderer for content/chapter lessons, LessonQuizShell for
 * quiz lessons, homework-submission view for homework lessons).
 */
export function LessonPlayerShell({
  course,
  currentLessonId,
  onSelectLesson,
  onPrevious,
  onNext,
  canGoNext,
  canGoPrevious,
  children,
}: LessonPlayerShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelectLesson = (lessonId: string) => {
    onSelectLesson(lessonId);
    setSheetOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Mobile: outline trigger button + sheet drawer */}
      <div className="border-b px-4 py-2 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm">
                <Menu className="mr-2 h-4 w-4" />
                Course outline
              </Button>
            }
          />
          <SheetContent side="left" className="w-80 p-0">
            <LessonOutlineSidebar
              course={course}
              currentLessonId={currentLessonId}
              onSelectLesson={handleSelectLesson}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: inline sidebar */}
      <aside className="hidden w-72 shrink-0 border-r overflow-y-auto lg:block">
        <LessonOutlineSidebar
          course={course}
          currentLessonId={currentLessonId}
          onSelectLesson={onSelectLesson}
        />
      </aside>

      {/* Main pane */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl p-6">{children}</div>
        </div>
        {/* Sticky bottom bar */}
        <div className="flex items-center justify-between border-t bg-background p-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button onClick={onNext} disabled={!canGoNext}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
