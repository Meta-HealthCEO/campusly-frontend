'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  Mail,
  AlertCircle,
  Bell,
  Clock,
} from 'lucide-react';
import { mockMessages, mockParents } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import { messageSchema, type MessageFormData } from '@/lib/validations';

const priorityConfig: Record<string, { color: string; icon: typeof Bell }> = {
  low: { color: 'text-gray-500', icon: Bell },
  normal: { color: 'text-blue-500', icon: Bell },
  high: { color: 'text-amber-500', icon: AlertCircle },
  urgent: { color: 'text-red-500', icon: AlertCircle },
};

const typeConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  message: { variant: 'outline' },
  announcement: { variant: 'secondary' },
  alert: { variant: 'destructive' },
};

export default function TeacherCommunicationPage() {
  const [open, setOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      priority: 'normal',
      recipientIds: [],
    },
  });

  const onSubmit = (data: MessageFormData) => {
    console.log('New message:', data);
    setOpen(false);
    reset();
    setSelectedRecipients([]);
  };

  const addRecipient = (parentId: string) => {
    if (!selectedRecipients.includes(parentId)) {
      const newRecipients = [...selectedRecipients, parentId];
      setSelectedRecipients(newRecipients);
      setValue('recipientIds', newRecipients);
    }
  };

  const removeRecipient = (parentId: string) => {
    const newRecipients = selectedRecipients.filter((id) => id !== parentId);
    setSelectedRecipients(newRecipients);
    setValue('recipientIds', newRecipients);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication"
        description="Send messages to parents and guardians"
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <Send className="mr-2 h-4 w-4" />
                Message Parents
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Compose Message</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select onValueChange={(val) => addRecipient(val as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockParents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.userId}>
                        {parent.user.firstName} {parent.user.lastName} (
                        {parent.relationship})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedRecipients.map((id) => {
                      const parent = mockParents.find(
                        (p) => p.userId === id
                      );
                      if (!parent) return null;
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeRecipient(id)}
                        >
                          {parent.user.firstName} {parent.user.lastName} x
                        </Badge>
                      );
                    })}
                  </div>
                )}
                {errors.recipientIds && (
                  <p className="text-xs text-destructive">
                    {errors.recipientIds.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Message subject"
                  {...register('subject')}
                />
                {errors.subject && (
                  <p className="text-xs text-destructive">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  defaultValue="normal"
                  onValueChange={(val) =>
                    setValue(
                      'priority',
                      val as 'low' | 'normal' | 'high' | 'urgent'
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
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
                  <p className="text-xs text-destructive">
                    {errors.body.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Messages List */}
      {mockMessages.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Messages"
          description="Your sent and received messages will appear here."
        />
      ) : (
        <div className="space-y-3">
          {mockMessages.map((message) => {
            const PriorityIcon =
              priorityConfig[message.priority]?.icon || Bell;
            const typeVariant =
              typeConfig[message.type]?.variant || 'outline';

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
                          <Badge variant={typeVariant}>
                            {message.type}
                          </Badge>
                          <PriorityIcon
                            className={`h-4 w-4 ${
                              priorityConfig[message.priority]?.color
                            }`}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.body}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          From: {message.sender.firstName}{' '}
                          {message.sender.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          &middot;
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(message.createdAt)}
                        </span>
                        {!message.isRead && (
                          <Badge variant="default" className="ml-auto">
                            New
                          </Badge>
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
    </div>
  );
}
