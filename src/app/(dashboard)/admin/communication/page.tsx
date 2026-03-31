'use client';

import { useState } from 'react';
import { Plus, Mail } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateManager } from '@/components/communication/TemplateManager';
import { ComposeMessageDialog } from '@/components/communication/ComposeMessageDialog';
import { MessageHistoryTable } from '@/components/communication/MessageHistoryTable';
import { MessageDetailView } from '@/components/communication/MessageDetailView';
import { useTemplates, useBulkMessages } from '@/hooks/useCommunication';
import type { BulkMessage } from '@/components/communication/types';

export default function AdminCommunicationPage() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailMessageId, setDetailMessageId] = useState<string | null>(null);

  const {
    templates, loading: templatesLoading,
    createTemplate, updateTemplate, deleteTemplate,
  } = useTemplates();

  const {
    messages, loading: messagesLoading,
    page, totalPages, fetchMessages, sendMessage,
  } = useBulkMessages();

  const handleViewDetail = (msg: BulkMessage) => {
    setDetailMessageId(msg.id);
  };

  const handleBackFromDetail = () => {
    setDetailMessageId(null);
  };

  const handlePageChange = (p: number) => {
    fetchMessages(p);
  };

  if (detailMessageId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Message Detail" description="View delivery stats and logs" />
        <MessageDetailView messageId={detailMessageId} onBack={handleBackFromDetail} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Communication" description="Send messages and announcements to parents and staff">
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </PageHeader>

      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">
            <Mail className="mr-1.5 h-4 w-4" />
            Sent Messages
          </TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <MessageHistoryTable
            messages={messages}
            loading={messagesLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onViewDetail={handleViewDetail}
          />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateManager
            templates={templates}
            loading={templatesLoading}
            onCreateTemplate={createTemplate}
            onUpdateTemplate={updateTemplate}
            onDeleteTemplate={deleteTemplate}
          />
        </TabsContent>
      </Tabs>

      <ComposeMessageDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        templates={templates}
        onSend={async (data) => {
          await sendMessage(data);
        }}
      />
    </div>
  );
}
