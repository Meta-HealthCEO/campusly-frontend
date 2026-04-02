'use client';

import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TutorConversationSummary, TutorMode } from '@/types';

interface ConversationListProps {
  conversations: TutorConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}

const MODE_LABELS: Record<TutorMode, string> = {
  chat: 'Chat',
  homework_help: 'Homework',
  practice: 'Practice',
  exam_prep: 'Exam Prep',
};

function formatRelative(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

export function ConversationList({ conversations, activeId, onSelect, onNew }: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Button onClick={onNew} className="w-full" size="default">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8" />
            <p>No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted',
                  activeId === conv.id && 'bg-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{conv.title}</p>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {MODE_LABELS[conv.mode]}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="truncate text-xs text-muted-foreground">
                    {conv.subjectName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(conv.lastMessageAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
