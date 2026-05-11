'use client';

import { Loader2, Presentation, FileText, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Props {
  lessonId: string;
  lessonTitle: string;
  open: boolean;
  onClose: () => void;
  /** Triggers the existing teacher/student PDF export flow on the parent page. */
  onExportPdf: (mode: 'teacher' | 'student') => Promise<void> | void;
  exportingPdf: 'teacher' | 'student' | null;
  /** Triggers the .pptx slideshow download flow on the parent page. */
  onExportSlides: () => Promise<void> | void;
  exportingSlides: boolean;
}

/**
 * Right-side slide-out drawer hosting all lesson-level actions (exports,
 * future automations). Lives at workspace level so the header stays clean —
 * the header just has one "Actions" button that opens this.
 *
 * Designed to grow: each action is a self-contained Card row so adding a new
 * action (e.g. "Translate to Afrikaans", "Generate parent email", etc.) is a
 * one-component change.
 */
export function LessonActionsDrawer({
  lessonId: _lessonId,
  lessonTitle: _lessonTitle,
  open,
  onClose,
  onExportPdf,
  exportingPdf,
  onExportSlides,
  exportingSlides,
}: Props) {
  // Hint to readers that the parent owns lesson identity — the drawer is
  // purely a UI shell over callbacks. _lessonId / _lessonTitle are accepted
  // so the API stays stable when individual action handlers later move
  // inside the drawer.
  void _lessonId;
  void _lessonTitle;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-lg">Lesson actions</SheetTitle>
          <SheetDescription>
            Export, share, or automate parts of this lesson.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <ActionCard
            icon={<Presentation className="h-5 w-5" />}
            title="Generate Slideshow (.pptx)"
            description="Builds a 16:9 PowerPoint deck from your lesson content."
            actionLabel="Generate"
            loading={exportingSlides}
            disabled={exportingSlides || exportingPdf !== null}
            onClick={() => void onExportSlides()}
          />
          <ActionCard
            icon={<FileText className="h-5 w-5" />}
            title="Export Teacher Pack (PDF)"
            description="Full lesson with memos and answer keys."
            actionLabel="Download"
            loading={exportingPdf === 'teacher'}
            disabled={exportingPdf !== null || exportingSlides}
            onClick={() => void onExportPdf('teacher')}
          />
          <ActionCard
            icon={<GraduationCap className="h-5 w-5" />}
            title="Export Student Pack (PDF)"
            description="Lesson without answers — for handouts."
            actionLabel="Download"
            loading={exportingPdf === 'student'}
            disabled={exportingPdf !== null || exportingSlides}
            onClick={() => void onExportPdf('student')}
          />
        </div>

        <SheetFooter className="border-t px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

function ActionCard({
  icon,
  title,
  description,
  actionLabel,
  loading,
  disabled,
  onClick,
}: ActionCardProps) {
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onClick}
        className="self-end"
      >
        {loading ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Working...
          </>
        ) : (
          actionLabel
        )}
      </Button>
    </Card>
  );
}
