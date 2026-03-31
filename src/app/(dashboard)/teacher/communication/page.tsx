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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { MessageSquare, Send, Mail, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { StatusBadge, ChannelBadge } from '@/components/communication/MessageBadges';
import { ParentRecipientPicker } from '@/components/communication/ParentRecipientPicker';
import { useBulkMessages, useParentsList } from '@/hooks/useCommunication';
import type { ChannelType } from '@/components/communication/types';
import type { BulkMessageSender } from '@/components/communication/types';

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

  const { messages, loading, sendMessage } = useBulkMessages();
  const { parents, loading: parentsLoading } = useParentsList();

  const {
    register, handleSubmit, setValue, reset, formState: { errors },
  } = useForm<TeacherComposeValues>({
    resolver: zodResolver(teacherComposeSchema),
    defaultValues: { channel: 'all' },
  });

  const onSubmit = async (data: TeacherComposeValues) => {
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    setSubmitting(true);
    try {
      await sendMessage({
        subject: data.subject,
        body: data.body,
        channel: data.channel,
        recipients: {
          type: 'custom',
          targetIds: selectedRecipients,
        },
      });
      toast.success('Message sent successfully!');
      setOpen(false);
      reset();
      setSelectedRecipients([]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to send message';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Communication" description="Send messages to parents and guardians">
        <Button onClick={() => setOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Message Parents
        </Button>
      </PageHeader>

      {messages.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Messages"
          description="Your sent messages will appear here."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((message) => {
            const senderName = typeof message.sentBy === 'string'
              ? message.sentBy
              : `${(message.sentBy as BulkMessageSender).firstName} ${(message.sentBy as BulkMessageSender).lastName}`.trim();

            return (
              <Card key={message.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{message.subject}</h3>
                        <div className="flex items-center gap-2">
                          <ChannelBadge channel={message.channel} />
                          <StatusBadge status={message.status} />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.body}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Message</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                className="min-h-[120px]"
                {...register('body')}
              />
              {errors.body && (
                <p className="text-xs text-destructive">{errors.body.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <Send className="mr-2 h-4 w-4" />
                {submitting ? 'Sending...' : 'Send Message'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
