'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { ThreadList } from '@/components/messaging/ThreadList';
import { MessageView } from '@/components/messaging/MessageView';
import { NewThreadDialog } from '@/components/messaging/NewThreadDialog';
import { useMessaging } from '@/hooks/useMessaging';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useRecipientLookup } from '@/hooks/useRecipientLookup';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ParentMessagesPage() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';

  const {
    threads, currentThread, loading, sending,
    loadThreads, loadThread, sendMessage, markAsRead, createThread,
  } = useMessaging();

  const { children, loading: childrenLoading } = useCurrentParent();
  const { recipients, loading: recipientsLoading, lookupForStudent } = useRecipientLookup('parent');

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showThread, setShowThread] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const handleSelectThread = useCallback(async (threadId: string) => {
    setActiveThreadId(threadId);
    setShowThread(true);
    await loadThread(threadId);
    await markAsRead(threadId);
  }, [loadThread, markAsRead]);

  const handleSend = useCallback(async (content: string) => {
    if (!activeThreadId) return;
    await sendMessage(activeThreadId, content);
  }, [activeThreadId, sendMessage]);

  const handleNewThread = useCallback(async (payload: Parameters<typeof createThread>[0]) => {
    const thread = await createThread(payload);
    if (thread) {
      setDialogOpen(false);
      setActiveThreadId(thread.id);
      setShowThread(true);
      await loadThread(thread.id);
    }
  }, [createThread, loadThread]);

  const handleBack = useCallback(() => {
    setShowThread(false);
    setActiveThreadId(null);
  }, []);

  if ((loading && threads.length === 0) || childrenLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Direct Messages"
        description="Private conversations with your children's teachers."
      />

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-220px)] min-h-[400px]">
          {/* Thread list */}
          <div className={`w-full lg:w-80 lg:border-r shrink-0 ${
            showThread ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
          }`}>
            <ThreadList
              threads={threads}
              activeThreadId={activeThreadId ?? undefined}
              onSelect={handleSelectThread}
              onNew={() => setDialogOpen(true)}
              currentUserId={userId}
            />
          </div>

          {/* Message view */}
          <div className={`flex-1 ${
            showThread ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}>
            {currentThread ? (
              <MessageView
                thread={currentThread.thread}
                messages={currentThread.messages}
                onSend={handleSend}
                sending={sending}
                currentUserId={userId}
                onBack={handleBack}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </Card>

      <NewThreadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleNewThread}
        userRole="parent"
        students={children}
        recipients={recipients}
        onStudentSelect={lookupForStudent}
        loadingRecipients={recipientsLoading}
      />
    </div>
  );
}
