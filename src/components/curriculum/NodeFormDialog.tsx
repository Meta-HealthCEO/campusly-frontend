'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CurriculumNodeItem,
  CurriculumNodeType,
  CreateNodePayload,
  UpdateNodePayload,
} from '@/types';

interface NodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitCreate: (data: CreateNodePayload) => Promise<void>;
  onSubmitUpdate: (id: string, data: UpdateNodePayload) => Promise<void>;
  editingNode: CurriculumNodeItem | null;
  parentNode: CurriculumNodeItem | null;
  frameworkId: string;
}

interface FormValues {
  title: string;
  code: string;
  type: CurriculumNodeType;
  description: string;
  order: number;
}

const NODE_TYPES: { value: CurriculumNodeType; label: string }[] = [
  { value: 'phase', label: 'Phase' },
  { value: 'grade', label: 'Grade' },
  { value: 'subject', label: 'Subject' },
  { value: 'term', label: 'Term' },
  { value: 'topic', label: 'Topic' },
  { value: 'subtopic', label: 'Subtopic' },
  { value: 'outcome', label: 'Outcome' },
];

function inferChildType(parentType: CurriculumNodeType): CurriculumNodeType {
  const hierarchy: Record<CurriculumNodeType, CurriculumNodeType> = {
    phase: 'grade',
    grade: 'subject',
    subject: 'term',
    term: 'topic',
    topic: 'subtopic',
    subtopic: 'outcome',
    outcome: 'outcome',
  };
  return hierarchy[parentType];
}

export function NodeFormDialog({
  open,
  onOpenChange,
  onSubmitCreate,
  onSubmitUpdate,
  editingNode,
  parentNode,
  frameworkId,
}: NodeFormDialogProps) {
  const isEditing = !!editingNode;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      code: '',
      type: 'topic',
      description: '',
      order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingNode) {
        reset({
          title: editingNode.title,
          code: editingNode.code,
          type: editingNode.type,
          description: editingNode.description,
          order: editingNode.order,
        });
      } else {
        reset({
          title: '',
          code: '',
          type: parentNode ? inferChildType(parentNode.type) : 'phase',
          description: '',
          order: 0,
        });
      }
    }
  }, [open, editingNode, parentNode, reset]);

  const onSubmit = async (values: FormValues) => {
    if (isEditing && editingNode) {
      await onSubmitUpdate(editingNode.id, {
        title: values.title,
        code: values.code,
        description: values.description,
        order: values.order,
      });
    } else {
      await onSubmitCreate({
        frameworkId,
        type: values.type,
        parentId: parentNode?.id ?? null,
        title: values.title,
        code: values.code,
        description: values.description,
        order: values.order,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? 'Edit Node'
              : parentNode
                ? `Add Child to "${parentNode.title}"`
                : 'Add Root Node'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 overflow-y-auto py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="title" {...register('title', { required: 'Title is required' })} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="code"
              placeholder="e.g. CAPS-MAT-GR10-T1"
              {...register('code', { required: 'Code is required' })}
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                defaultValue={parentNode ? inferChildType(parentNode.type) : 'phase'}
                onValueChange={(val: unknown) => setValue('type', val as CurriculumNodeType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">Sort Order</Label>
            <Input
              id="order"
              type="number"
              {...register('order', { valueAsNumber: true })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
