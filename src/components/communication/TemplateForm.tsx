'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { MessageTemplate, TemplateType, ChannelType } from './types';

const templateFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['fee_reminder', 'absence', 'general', 'event', 'emergency'], {
    error: 'Type is required',
  }),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  channel: z.enum(['email', 'sms', 'whatsapp', 'all']).optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface TemplateFormProps {
  initial?: MessageTemplate | null;
  onSubmit: (data: TemplateFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const templateTypes: { value: TemplateType; label: string }[] = [
  { value: 'fee_reminder', label: 'Fee Reminder' },
  { value: 'absence', label: 'Absence' },
  { value: 'general', label: 'General' },
  { value: 'event', label: 'Event' },
  { value: 'emergency', label: 'Emergency' },
];

const channels: { value: ChannelType; label: string }[] = [
  { value: 'all', label: 'All Channels' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export function TemplateForm({ initial, onSubmit, onCancel, submitting }: TemplateFormProps) {
  const {
    register, handleSubmit, setValue, reset, formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'general',
      subject: initial?.subject ?? '',
      body: initial?.body ?? '',
      channel: initial?.channel ?? 'all',
    },
  });

  useEffect(() => {
    if (initial) {
      reset({
        name: initial.name,
        type: initial.type,
        subject: initial.subject,
        body: initial.body,
        channel: initial.channel,
      });
    }
  }, [initial, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tpl-name">Template Name</Label>
        <Input id="tpl-name" {...register('name')} placeholder="e.g. End of term reminder" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            defaultValue={initial?.type ?? 'general'}
            onValueChange={(val: unknown) => setValue('type', val as TemplateType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {templateTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Channel</Label>
          <Select
            defaultValue={initial?.channel ?? 'all'}
            onValueChange={(val: unknown) => setValue('channel', val as ChannelType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tpl-subject">Subject</Label>
        <Input id="tpl-subject" {...register('subject')} placeholder="Message subject" />
        {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tpl-body">Body</Label>
        <Textarea id="tpl-body" {...register('body')} placeholder="Message body..." rows={5} />
        {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : initial ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
}
