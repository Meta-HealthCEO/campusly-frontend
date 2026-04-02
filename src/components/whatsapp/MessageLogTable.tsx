'use client';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { MessageSquare } from 'lucide-react';
import type { WhatsAppMessage, WhatsAppMessageStatus } from '@/types/whatsapp';

interface MessageLogTableProps {
  messages: WhatsAppMessage[];
}

function statusVariant(status: WhatsAppMessageStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'delivered': return 'default';
    case 'read': return 'secondary';
    case 'failed': return 'destructive';
    default: return 'outline';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-ZA', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatTemplateType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function MessageLogTable({ messages }: MessageLogTableProps) {
  if (messages.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No messages yet"
        description="Messages will appear here once WhatsApp messaging is active."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Sent</TableHead>
            <TableHead className="hidden sm:table-cell">Delivered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((msg) => (
            <TableRow key={msg.id}>
              <TableCell>
                <div className="truncate max-w-[160px]">{msg.recipientName}</div>
                <div className="text-xs text-muted-foreground truncate">{msg.recipientPhone}</div>
              </TableCell>
              <TableCell>{formatTemplateType(msg.templateType)}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(msg.status)}>{msg.status}</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{formatDate(msg.sentAt)}</TableCell>
              <TableCell className="hidden sm:table-cell">{formatDate(msg.deliveredAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
