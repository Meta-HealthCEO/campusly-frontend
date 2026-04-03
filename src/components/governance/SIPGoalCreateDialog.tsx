'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SIPGoal, CreateSIPGoalPayload, GoalPriority } from '@/types';

const WSE_LABELS: Record<number, string> = {
  1: 'Basic Functionality',
  2: 'Leadership & Management',
  3: 'Governance & Relationships',
  4: 'Teaching & Learning',
  5: 'Curriculum & Resources',
  6: 'Learner Achievement',
  7: 'Safety & Discipline',
  8: 'Infrastructure',
  9: 'Parents & Community',
};

interface SIPGoalCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SIPGoal | null;
  sipId: string;
  onSubmit: (data: CreateSIPGoalPayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<SIPGoal>) => Promise<void>;
}

interface FormValues {
  title: string;
  description: string;
  responsiblePersonId: string;
  targetDate: string;
}

export function SIPGoalCreateDialog({
  open, onOpenChange, goal, onSubmit, onUpdate,
}: SIPGoalCreateDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();
  const [wseArea, setWseArea] = useState<number>(1);
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [submitting, setSubmitting] = useState(false);
  const isEdit = goal !== null;

  useEffect(() => {
    if (open) {
      reset(
        goal
          ? {
              title: goal.title,
              description: goal.description ?? '',
              responsiblePersonId:
                typeof goal.responsiblePersonId === 'string'
                  ? goal.responsiblePersonId
                  : goal.responsiblePersonId?.id ?? '',
              targetDate: goal.targetDate.slice(0, 10),
            }
          : { title: '', description: '', responsiblePersonId: '', targetDate: '' },
      );
      setWseArea(goal?.wseArea ?? 1);
      setPriority(goal?.priority ?? 'medium');
    }
  }, [open, goal, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload: CreateSIPGoalPayload = {
        title: values.title,
        description: values.description || undefined,
        wseArea,
        responsiblePersonId: values.responsiblePersonId || undefined,
        targetDate: values.targetDate,
        priority,
      };
      if (isEdit && onUpdate) {
        await onUpdate(goal.id, payload);
      } else {
        await onSubmit(payload);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label htmlFor="goal-title">Title <span className="text-destructive">*</span></Label>
              <Input id="goal-title" {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="goal-description">Description</Label>
              <Textarea id="goal-description" rows={3} {...register('description')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>WSE Area <span className="text-destructive">*</span></Label>
                <Select
                  value={String(wseArea)}
                  onValueChange={(val: unknown) => setWseArea(Number(val as string))}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WSE_LABELS).map(([num, label]) => (
                      <SelectItem key={num} value={num}>
                        WSE {num}: {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(val: unknown) => setPriority(val as GoalPriority)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="goal-responsible">Responsible Person ID</Label>
              <Input id="goal-responsible" {...register('responsiblePersonId')} placeholder="User ID" />
            </div>
            <div>
              <Label htmlFor="goal-target">Target Date <span className="text-destructive">*</span></Label>
              <Input
                id="goal-target"
                type="date"
                {...register('targetDate', { required: 'Target date is required' })}
              />
              {errors.targetDate && <p className="text-xs text-destructive">{errors.targetDate.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update Goal' : 'Add Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
