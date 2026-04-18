'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  getLessonPlanSubjectName,
  getLessonPlanClassName,
  getLessonPlanTopicName,
  getLessonPlanTeacherName,
} from '@/lib/lesson-plan-helpers';
import { useTeacherLessonPlans } from '@/hooks/useTeacherLessonPlans';
import type { LessonPlan, Homework } from '@/types';

interface LessonPlanDetailDialogProps {
  plan: LessonPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HOMEWORK_TYPES = ['quiz', 'reading', 'exercise'] as const;

function isPopulatedHomeworkList(
  homeworkIds: LessonPlan['homeworkIds'],
): homeworkIds is Homework[] {
  return (
    Array.isArray(homeworkIds)
    && homeworkIds.length > 0
    && typeof homeworkIds[0] === 'object'
    && homeworkIds[0] !== null
  );
}

export function LessonPlanDetailDialog({ plan, open, onOpenChange }: LessonPlanDetailDialogProps) {
  const { downloadLessonPlanPdf } = useTeacherLessonPlans();
  const [downloading, setDownloading] = useState(false);

  if (!plan) return null;

  const subjectName = getLessonPlanSubjectName(plan);
  const className = getLessonPlanClassName(plan);
  const topicName = getLessonPlanTopicName(plan);
  const teacherName = getLessonPlanTeacherName(plan);

  const handleDownload = async (): Promise<void> => {
    if (!plan._id) return;
    setDownloading(true);
    try {
      await downloadLessonPlanPdf(plan._id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const populatedHomework = isPopulatedHomeworkList(plan.homeworkIds) ? plan.homeworkIds : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{plan.topic}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
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

          {/* Homework — grouped by type */}
          {populatedHomework && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Homework</h3>
              {HOMEWORK_TYPES.map((type) => {
                const items = populatedHomework.filter((h: Homework) => h.type === type);
                if (items.length === 0) return null;
                return (
                  <div key={type} className="mb-3">
                    <h4 className="text-sm font-medium capitalize">{type}</h4>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {items.map((h: Homework) => (
                        <li key={h._id}>
                          {h.title}
                          {h.type === 'reading' && h.pageRange ? ` — pp. ${h.pageRange}` : ''}
                          {h.type === 'exercise' ? ` — ${h.exerciseQuestionIds.length} question(s)` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
