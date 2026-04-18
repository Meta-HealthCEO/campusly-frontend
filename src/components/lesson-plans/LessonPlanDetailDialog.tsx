'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  getLessonPlanSubjectName,
  getLessonPlanClassName,
  getLessonPlanTopicName,
  getLessonPlanTeacherName,
} from '@/lib/lesson-plan-helpers';
import type { LessonPlan } from '@/hooks/useTeacherLessonPlans';

interface LessonPlanDetailDialogProps {
  plan: LessonPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LessonPlanDetailDialog({ plan, open, onOpenChange }: LessonPlanDetailDialogProps) {
  if (!plan) return null;

  const subjectName = getLessonPlanSubjectName(plan);
  const className = getLessonPlanClassName(plan);
  const topicName = getLessonPlanTopicName(plan);
  const teacherName = getLessonPlanTeacherName(plan);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl print:max-h-none print:max-w-none print:shadow-none">
        <DialogHeader className="print:mb-4">
          <DialogTitle className="text-lg">{plan.topic}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 print:overflow-visible">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{formatDate(plan.date)}</Badge>
            {subjectName && <Badge variant="secondary">{subjectName}</Badge>}
            {className && <Badge variant="secondary">{className}</Badge>}
            {topicName && <Badge variant="secondary">{topicName}</Badge>}
            {teacherName && <Badge variant="outline">{teacherName}</Badge>}
          </div>

          {/* Objectives */}
          {plan.objectives.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Objectives</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {plan.objectives.map((obj: string, i: number) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Activities */}
          {plan.activities.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Activities</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {plan.activities.map((act: string, i: number) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Resources */}
          {plan.resources.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Resources</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {plan.resources.map((res: string, i: number) => (
                  <li key={i}>{res}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Homework */}
          {plan.homework && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Homework</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.homework}</p>
            </section>
          )}

          {/* Reflection Notes */}
          {plan.reflectionNotes && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Reflection Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.reflectionNotes}</p>
            </section>
          )}
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
