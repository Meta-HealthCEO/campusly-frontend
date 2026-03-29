'use client';

import { useState } from 'react';
import { Plus, Mail, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { mockMessages } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import { messageSchema, type MessageFormData } from '@/lib/validations';

const priorityStyles: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const typeStyles: Record<string, string> = {
  message: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  announcement: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  alert: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function CommunicationPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      type: 'message',
      priority: 'normal',
    },
  });

  const onSubmit = async (data: MessageFormData) => {
    console.log('New message:', data);
    toast.success('Message sent successfully!');
    reset();
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Communication" description="Send messages and announcements to parents and staff">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Compose Message</DialogTitle>
              <DialogDescription>Send a message, announcement, or alert.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" {...register('subject')} placeholder="Message subject" />
                {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" {...register('body')} placeholder="Write your message..." rows={4} />
                {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select defaultValue="message" onValueChange={(val: unknown) => setValue('type', val as MessageFormData['type'])}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">Message</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select defaultValue="normal" onValueChange={(val: unknown) => setValue('priority', val as MessageFormData['priority'])}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientIds">Recipients (comma-separated IDs)</Label>
                <Input id="recipientIds" {...register('recipientIds')} placeholder="e.g. u3, u7" />
                {errors.recipientIds && <p className="text-xs text-destructive">{errors.recipientIds.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Sending...' : 'Send'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {mockMessages.length === 0 ? (
        <EmptyState icon={Mail} title="No messages" description="No messages have been sent yet." />
      ) : (
        <div className="space-y-3">
          {mockMessages.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{msg.subject}</h3>
                      {!msg.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{msg.body}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>From: {msg.sender.firstName} {msg.sender.lastName}</span>
                      <span>|</span>
                      <span>{formatDate(msg.createdAt, 'dd MMM yyyy HH:mm')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={typeStyles[msg.type] || ''}>
                      {msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}
                    </Badge>
                    <Badge className={priorityStyles[msg.priority] || ''}>
                      {msg.priority.charAt(0).toUpperCase() + msg.priority.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
