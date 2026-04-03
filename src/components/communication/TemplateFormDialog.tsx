'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { VariableChips } from './VariableChips';
import type { CommTemplate, TemplateChannel, TemplateCategory, CreateCommTemplatePayload } from '@/types';

const schema = z.object({
  name: z.string().min(3, 'Min 3 chars').max(100),
  description: z.string().max(500).optional(),
  channel: z.enum(['email', 'sms', 'whatsapp', 'push', 'all']),
  category: z.enum(['attendance', 'fees', 'academic', 'events', 'general', 'emergency']),
  subject: z.string().optional(),
  body: z.string().min(1, 'Body is required'),
});

type FormValues = z.infer<typeof schema>;

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CommTemplate | null;
  onSubmit: (data: CreateCommTemplatePayload) => Promise<void>;
  submitting?: boolean;
}

const channelOptions: { value: TemplateChannel; label: string }[] = [
  { value: 'all', label: 'All Channels' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
];

const categoryOptions: { value: TemplateCategory; label: string }[] = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'fees', label: 'Fees' },
  { value: 'academic', label: 'Academic' },
  { value: 'events', label: 'Events' },
  { value: 'general', label: 'General' },
  { value: 'emergency', label: 'Emergency' },
];

function extractVars(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{|\}/g, '')))];
}

export function TemplateFormDialog({
  open, onOpenChange, initial, onSubmit, submitting,
}: TemplateFormDialogProps) {
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', description: '', channel: 'all', category: 'general', subject: '', body: '',
    },
  });

  const bodyValue = watch('body');
  const channelValue = watch('channel');

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        description: initial?.description ?? '',
        channel: initial?.channel ?? 'all',
        category: initial?.category ?? 'general',
        subject: initial?.subject ?? '',
        body: initial?.body ?? '',
      });
    }
  }, [open, initial, reset]);

  const insertVariable = useCallback((variable: string) => {
    const el = bodyRef.current;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? start;
      const newVal = el.value.slice(0, start) + variable + el.value.slice(end);
      setValue('body', newVal);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      });
    } else {
      setValue('body', (bodyValue ?? '') + variable);
    }
  }, [bodyValue, setValue]);

  const handleFormSubmit = async (data: FormValues) => {
    const variables = extractVars(data.body + (data.subject ?? ''));
    await onSubmit({ ...data, variables });
    onOpenChange(false);
  };

  const { ref: bodyRegRef, ...bodyRest } = register('body');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Template' : 'Create Template'}</DialogTitle>
          <DialogDescription>
            {initial ? 'Update the message template.' : 'Create a new message template with variable placeholders.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Name <span className="text-destructive">*</span></Label>
              <Input id="tpl-name" {...register('name')} placeholder="e.g. Absence Alert" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tpl-desc">Description</Label>
              <Input id="tpl-desc" {...register('description')} placeholder="Short description" />
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Channel <span className="text-destructive">*</span></Label>
                <Select
                  value={channelValue}
                  onValueChange={(val: unknown) => setValue('channel', val as TemplateChannel)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {channelOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select
                  defaultValue={initial?.category ?? 'general'}
                  onValueChange={(val: unknown) => setValue('category', val as TemplateCategory)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(channelValue === 'email' || channelValue === 'all') && (
              <div className="space-y-2">
                <Label htmlFor="tpl-subject">Subject (email)</Label>
                <Input id="tpl-subject" {...register('subject')} placeholder="{{schoolName}} - Absence Alert" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tpl-body">Body <span className="text-destructive">*</span></Label>
              <Textarea
                id="tpl-body"
                {...bodyRest}
                ref={(el) => {
                  bodyRegRef(el);
                  bodyRef.current = el;
                }}
                placeholder="Dear {{parentName}}, ..."
                rows={5}
              />
              {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
            </div>

            <VariableChips
              onInsert={insertVariable}
              selectedVariables={extractVars(bodyValue + (watch('subject') ?? ''))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : initial ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
