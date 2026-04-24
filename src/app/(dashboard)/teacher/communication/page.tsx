'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Send, Mail, Clock, ArrowRight, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { StatusBadge, ChannelBadge } from '@/components/communication/MessageBadges';
import { DeliveryDashboard } from '@/components/communication/DeliveryDashboard';
import { ParentRecipientPicker } from '@/components/communication/ParentRecipientPicker';
import { TeacherMessageTemplatePicker } from '@/components/communication/TeacherMessageTemplatePicker';
import { ScheduledMessagesList } from '@/components/communication/ScheduledMessagesList';
import { useBulkMessages, useParentsList, useTemplates, useScheduledMessages } from '@/hooks/useCommunication';
import type { ChannelType, BulkMessageSender } from '@/components/communication/types';

const teacherComposeSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  body: z.string().min(10, 'Message must be at least 10 characters'),
  channel: z.enum(['email', 'sms', 'whatsapp', 'all']).optional(),
});

type TeacherComposeValues = z.infer<typeof teacherComposeSchema>;

export default function TeacherCommunicationPage() {
  const [open, setOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sendLater, setSendLater] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsBulkId, setDetailsBulkId] = useState<string | null>(null);

  const { messages, loading, sendMessage, scheduleMessage, getMessageLogs } = useBulkMessages();
  const { parents, loading: parentsLoading } = useParentsList();
  const { templates, createTemplate } = useTemplates();
  const { scheduled, loading: scheduledLoading, cancel: cancelScheduled } = useScheduledMessages();

  const {
    register, handleSubmit, setValue, watch, reset, formState: { errors },
  } = useForm<TeacherComposeValues>({
    resolver: zodResolver(teacherComposeSchema),
    defaultValues: { channel: 'all' },
  });

  const watchSubject = watch('subject') ?? '';
  const watchBody = watch('body') ?? '';
  const watchChannel = watch('channel') ?? 'all';

  // Minimum datetime-local value (current time + 2 minutes)
  const _d = new Date(Date.now() + 2 * 60 * 1000);
  const minDatetime = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}T${String(_d.getHours()).padStart(2, '0')}:${String(_d.getMinutes()).padStart(2, '0')}`;

  const onSubmit = async (data: TeacherComposeValues) => {
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (sendLater && !scheduledFor) {
      toast.error('Please select a scheduled date and time');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        subject: data.subject,
        body: data.body,
        channel: data.channel,
        recipients: { type: 'custom' as const, targetIds: selectedRecipients },
      };
      if (sendLater) {
        await scheduleMessage({ ...payload, scheduledFor: new Date(scheduledFor).toISOString() });
        toast.success('Message scheduled successfully!');
      } else {
        await sendMessage(payload);
        toast.success('Message sent successfully!');
      }
      setOpen(false);
      reset();
      setSelectedRecipients([]);
      setSendLater(false);
      setScheduledFor('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to send message';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTemplateSelect = (tpl: { subject: string; body: string; channel: ChannelType }) => {
    setValue('subject', tpl.subject); setValue('body', tpl.body); setValue('channel', tpl.channel);
  };

  const handleSaveTemplate = async (data: {
    name: string; subject: string; body: string; channel: ChannelType;
  }) => {
    try {
      await createTemplate({ name: data.name, type: 'general', subject: data.subject, body: data.body, channel: data.channel });
      toast.success('Template saved');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to save template';
      toast.error(msg);
      throw err;
    }
  };

  if (loading) return <LoadingSpinner />;

  const sentMessages = messages.filter((m) => m.status !== 'scheduled');

  return (
    <div className="space-y-6">
      <PageHeader title="Communication" description="Send messages to parents and guardians">
        <Button onClick={() => setOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Message Parents
        </Button>
      </PageHeader>

      <Link
        href="/teacher/messages"
        className="flex items-center justify-between rounded-lg border bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <div>
          <p className="font-medium text-sm">Direct Messages</p>
          <p className="text-xs text-muted-foreground">Have a private conversation with a parent</p>
        </div>
        <ArrowRight className="h-4 w-4 text-primary" />
      </Link>

      {/* Scheduled messages */}
      {(scheduled.length > 0 || scheduledLoading) && (
        <ScheduledMessagesList
          messages={scheduled}
          loading={scheduledLoading}
          onCancel={cancelScheduled}
        />
      )}

      {/* Sent message history */}
      {sentMessages.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Messages"
          description="Your sent messages will appear here."
        />
      ) : (
        <div className="space-y-3">
          {sentMessages.map((message) => {
            const senderName = typeof message.sentBy === 'string' ? message.sentBy : `${(message.sentBy as BulkMessageSender).firstName} ${(message.sentBy as BulkMessageSender).lastName}`.trim();

            return (
              <Card key={message.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium truncate">{message.subject}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <ChannelBadge channel={message.channel} />
                          <StatusBadge status={message.status} />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{message.body}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          To: {message.totalRecipients} recipient{message.totalRecipients !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-muted-foreground">&middot;</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {message.sentAt ? formatDate(message.sentAt) : formatDate(message.createdAt)}
                        </span>
                        {senderName && (
                          <>
                            <span className="text-xs text-muted-foreground">&middot;</span>
                            <span className="text-xs text-muted-foreground">By: {senderName}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => { setDetailsBulkId(message.id); setDetailsOpen(true); }}
                          className="ml-auto text-xs text-primary hover:underline shrink-0"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeliveryDashboard
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        bulkId={detailsBulkId}
        messageSubject={messages.find((m) => m.id === detailsBulkId)?.subject}
        loadLogs={getMessageLogs}
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSendLater(false); setScheduledFor(''); } }}>
        <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-1">
            <form id="teacher-compose-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <TeacherMessageTemplatePicker
                templates={templates}
                currentSubject={watchSubject}
                currentBody={watchBody}
                currentChannel={watchChannel as ChannelType}
                onTemplateSelect={handleTemplateSelect}
                onSaveTemplate={handleSaveTemplate}
              />

              <ParentRecipientPicker
                parents={parents}
                selectedIds={selectedRecipients}
                onChange={setSelectedRecipients}
                loading={parentsLoading}
              />
              {selectedRecipients.length === 0 && (
                <p className="text-xs text-destructive">At least one recipient is required</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Message subject" {...register('subject')} />
                {errors.subject && (
                  <p className="text-xs text-destructive">{errors.subject.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  defaultValue="all"
                  onValueChange={(val: unknown) => setValue('channel', val as ChannelType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  placeholder="Type your message..."
                  className="min-h-30"
                  {...register('body')}
                />
                {errors.body && (
                  <p className="text-xs text-destructive">{errors.body.message}</p>
                )}
              </div>

              {/* Send later toggle */}
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Checkbox
                  id="send-later"
                  checked={sendLater}
                  onCheckedChange={(checked) => {
                    setSendLater(Boolean(checked));
                    if (!checked) setScheduledFor('');
                  }}
                />
                <Label htmlFor="send-later" className="flex items-center gap-2 cursor-pointer">
                  <CalendarClock className="h-4 w-4 text-amber-600" />
                  Send later
                </Label>
              </div>

              {sendLater && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled-for">
                    Schedule date &amp; time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="scheduled-for"
                    type="datetime-local"
                    min={minDatetime}
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full"
                  />
                  {sendLater && !scheduledFor && (
                    <p className="text-xs text-destructive">Scheduled date and time is required</p>
                  )}
                </div>
              )}
            </form>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setSendLater(false); setScheduledFor(''); }}>
              Cancel
            </Button>
            <Button type="submit" form="teacher-compose-form" disabled={submitting}>
              {sendLater ? (
                <>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  {submitting ? 'Scheduling...' : 'Schedule'}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? 'Sending...' : 'Send Message'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
