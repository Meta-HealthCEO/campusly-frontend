'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Lock, Search } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { UnreadBadge } from './UnreadBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import type { MessageThread } from '@/types';

interface ThreadListProps {
  threads: MessageThread[];
  activeThreadId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  currentUserId: string;
}

function getOtherParticipant(thread: MessageThread, currentUserId: string) {
  return thread.participants.find((p) => p.userId !== currentUserId)
    ?? thread.participants[0];
}

export function ThreadList({
  threads, activeThreadId, onSelect, onNew, currentUserId,
}: ThreadListProps) {
  const [search, setSearch] = useState('');

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) => {
      const other = getOtherParticipant(thread, currentUserId);
      return (
        (other?.name ?? '').toLowerCase().includes(q)
        || (thread.studentName ?? '').toLowerCase().includes(q)
        || (thread.subject ?? '').toLowerCase().includes(q)
        || (thread.lastMessagePreview ?? '').toLowerCase().includes(q)
      );
    });
  }, [threads, search, currentUserId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h2 className="font-semibold text-lg">Messages</h2>
        <Button size="sm" onClick={onNew}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      {threads.length > 0 && (
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 h-9"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={MessageSquare}
              title="No conversations"
              description="Start a new message to begin a conversation."
            />
          </div>
        ) : filteredThreads.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No conversations match &quot;{search}&quot;.
          </p>
        ) : (
          <div className="divide-y">
            {filteredThreads.map((thread) => {
              const other = getOtherParticipant(thread, currentUserId);
              const isActive = thread.id === activeThreadId;

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelect(thread.id)}
                  className={`w-full text-left p-3 transition-colors hover:bg-muted/50 ${
                    isActive ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {other?.name ?? 'Unknown'}
                        </span>
                        {thread.isClosed && (
                          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <UnreadBadge count={thread.unreadCount} />
                      </div>
                      {thread.studentName && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                          {thread.studentName}
                        </Badge>
                      )}
                      {thread.subject && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {thread.subject}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {thread.lastMessagePreview}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {thread.lastMessageAt && formatRelativeDate(thread.lastMessageAt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
