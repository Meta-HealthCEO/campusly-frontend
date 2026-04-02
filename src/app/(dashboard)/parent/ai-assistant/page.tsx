'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useParentAI } from '@/hooks/useParentAI';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChatInterface } from '@/components/ai-tutor/ChatInterface';
import { ConversationList } from '@/components/ai-tutor/ConversationList';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function ParentAIAssistantPage() {
  const { parent, children, loading: parentLoading } = useCurrentParent();
  const {
    conversations,
    currentConversation,
    sending,
    loadConversations,
    loadConversation,
    sendMessage,
    startNewConversation,
  } = useParentAI();

  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  if (parentLoading) return <LoadingSpinner />;

  if (!parent) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Parent profile not found"
        description="We could not locate your parent record."
      />
    );
  }

  const handleSend = (message: string) => {
    sendMessage({
      conversationId: currentConversation?.id,
      childId: selectedChildId,
      message,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="AI Assistant" description="Ask questions about your child's progress" />

      {children.length > 1 && (
        <div className="space-y-1.5">
          <Label>Select Child</Label>
          <Select value={selectedChildId} onValueChange={(v: unknown) => setSelectedChildId(v as string)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex h-[calc(100vh-16rem)] gap-4">
        <div className="hidden w-72 shrink-0 overflow-hidden rounded-lg border lg:block">
          <ConversationList
            conversations={conversations}
            activeId={currentConversation?.id}
            onSelect={loadConversation}
            onNew={startNewConversation}
          />
        </div>
        <div className="flex flex-1 overflow-hidden rounded-lg border">
          <ChatInterface
            conversation={currentConversation}
            onSend={handleSend}
            sending={sending}
          />
        </div>
      </div>
    </div>
  );
}
