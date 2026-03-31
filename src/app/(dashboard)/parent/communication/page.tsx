'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Mail, MailOpen, AlertCircle, MessageSquare, Megaphone,
} from 'lucide-react';
import { formatDate, formatRelativeDate } from '@/lib/utils';
import { useParentMessages } from '@/hooks/useParentMessages';
import type { Message } from '@/types';

const priorityStyles: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-red-100 text-red-800',
};

const typeIcons: Record<string, React.ElementType> = {
  message: MessageSquare,
  announcement: Megaphone,
  alert: AlertCircle,
};

export default function CommunicationPage() {
  const { messages, loading, markAsRead } = useParentMessages();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const handleOpenMessage = async (message: Message) => {
    setSelectedMessage(message);
    setDialogOpen(true);
    if (!message.isRead) {
      await markAsRead(message.id);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="View messages, announcements, and alerts from the school." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5"><Mail className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{messages.length}</p><p className="text-sm text-muted-foreground">Total Messages</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5"><Mail className="h-5 w-5 text-amber-700" /></div>
            <div><p className="text-2xl font-bold">{unreadCount}</p><p className="text-sm text-muted-foreground">Unread</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-xl bg-red-100 p-2.5"><AlertCircle className="h-5 w-5 text-red-700" /></div>
            <div><p className="text-2xl font-bold">{messages.filter((m) => m.priority === 'urgent').length}</p><p className="text-sm text-muted-foreground">Urgent</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Inbox</CardTitle></CardHeader>
        <CardContent>
          {messages.length > 0 ? (
            <div className="space-y-1">
              {messages.map((message) => {
                const TypeIcon = typeIcons[message.type] ?? MessageSquare;
                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-muted/50 ${!message.isRead ? 'bg-muted/30' : ''}`}
                    onClick={() => handleOpenMessage(message)}
                  >
                    <div className="mt-0.5">
                      {message.isRead ? <MailOpen className="h-5 w-5 text-muted-foreground" /> : <Mail className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm truncate ${!message.isRead ? 'font-semibold' : 'font-medium'}`}>{message.subject}</p>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${priorityStyles[message.priority] ?? ''}`}>{message.priority}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 gap-1"><TypeIcon className="h-2.5 w-2.5" />{message.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">From: {message.sender.firstName} {message.sender.lastName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{message.body}</p>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 text-right">
                      {message.createdAt && <><p>{formatRelativeDate(message.createdAt)}</p><p className="mt-0.5">{formatDate(message.createdAt, 'dd MMM')}</p></>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Mail} title="No messages" description="Your inbox is empty. Messages from the school will appear here." />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedMessage && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg">{selectedMessage.subject}</DialogTitle>
                  <Badge variant="secondary" className={priorityStyles[selectedMessage.priority] ?? ''}>{selectedMessage.priority}</Badge>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">From: <span className="font-medium text-foreground">{selectedMessage.sender.firstName} {selectedMessage.sender.lastName}</span></div>
                  {selectedMessage.createdAt && <div className="text-muted-foreground">{formatDate(selectedMessage.createdAt, 'dd MMM yyyy HH:mm')}</div>}
                </div>
                <Separator />
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedMessage.body}</div>
                {selectedMessage.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Attachments</p>
                      <div className="space-y-1">
                        {selectedMessage.attachments.map((attachment, i) => (
                          <div key={i} className="text-sm text-primary underline cursor-pointer">{attachment}</div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
