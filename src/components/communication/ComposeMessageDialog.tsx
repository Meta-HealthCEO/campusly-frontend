'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { BulkMessageScopePicker } from './BulkMessageScopePicker';
import { TemplateSelector } from './TemplateSelector';
import type {
  MessageTemplate, ChannelType, RecipientScopeType, SendBulkMessageInput,
} from './types';

const composeSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  body: z.string().min(10, 'Message must be at least 10 characters'),
  channel: z.enum(['email', 'sms', 'whatsapp', 'all']).optional(),
});

type ComposeFormValues = z.infer<typeof composeSchema>;

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: MessageTemplate[];
  onSend: (data: Omit<SendBulkMessageInput, 'schoolId'>) => Promise<void>;
  onSchedule?: (data: Omit<SendBulkMessageInput, 'schoolId'> & { scheduledFor: string }) => Promise<void>;
}

const channels: { value: ChannelType; label: string }[] = [
  { value: 'all', label: 'All Channels' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export function ComposeMessageDialog({
  open, onOpenChange, templates, onSend, onSchedule,
}: ComposeMessageDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [scope, setScope] = useState<{
    type: RecipientScopeType;
    targetIds: string[];
  }>({ type: 'school', targetIds: [] });

  const {
    register, handleSubmit, setValue, reset, formState: { errors },
  } = useForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { channel: 'all' },
  });

  const handleTemplateSelect = (tpl: MessageTemplate | null) => {
    if (tpl) {
      setValue('subject', tpl.subject);
      setValue('body', tpl.body);
      setValue('channel', tpl.channel);
      setSelectedTemplateId(tpl.id);
    } else {
      setSelectedTemplateId(undefined);
    }
  };

  const onSubmit = async (data: ComposeFormValues) => {
    if ((scope.type === 'grade' || scope.type === 'class') && scope.targetIds.length === 0) {
      toast.error(`Please select at least one ${scope.type}`);
      return;
    }
    setSubmitting(true);
    try {
      await onSend({
        subject: data.subject,
        body: data.body,
        channel: data.channel,
        templateId: selectedTemplateId,
        recipients: {
          type: scope.type,
          targetIds: scope.targetIds.length > 0 ? scope.targetIds : undefined,
        },
      });
      toast.success('Message sent successfully!');
      reset();
      setScope({ type: 'school', targetIds: [] });
      setSelectedTemplateId(undefined);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to send message';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Bulk Message</DialogTitle>
          <DialogDescription>Send a message to parents. Select recipients by scope.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {templates.length > 0 && (
            <TemplateSelector templates={templates} onSelect={handleTemplateSelect} />
          )}

          <div className="space-y-2">
            <Label htmlFor="compose-subject">Subject</Label>
            <Input id="compose-subject" {...register('subject')} placeholder="Message subject" />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="compose-body">Message</Label>
            <Textarea
              id="compose-body"
              {...register('body')}
              placeholder="Write your message..."
              rows={5}
            />
            {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Channel</Label>
            <Select
              defaultValue="all"
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

          <BulkMessageScopePicker value={scope} onChange={setScope} />

          {onSchedule && (
            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs text-muted-foreground">Or schedule for later</Label>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full" />
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full" />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {onSchedule && scheduleDate && scheduleTime && (
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={handleSubmit(async (data) => {
                  setSubmitting(true);
                  try {
                    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
                    await onSchedule({
                      subject: data.subject,
                      body: data.body,
                      channel: data.channel,
                      templateId: selectedTemplateId,
                      recipients: {
                        type: scope.type,
                        targetIds: scope.targetIds.length > 0 ? scope.targetIds : undefined,
                      },
                      scheduledFor,
                    });
                    toast.success('Message scheduled!');
                    reset();
                    setScope({ type: 'school', targetIds: [] });
                    setScheduleDate('');
                    setScheduleTime('');
                    onOpenChange(false);
                  } catch (err: unknown) {
                    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to schedule';
                    toast.error(msg);
                  } finally {
                    setSubmitting(false);
                  }
                })}
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? 'Sending...' : 'Send Now'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
