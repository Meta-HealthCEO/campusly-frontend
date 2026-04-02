// ============================================================
// Direct Messaging Types — Teacher ↔ Parent Threads
// ============================================================

export interface ThreadParticipant {
  userId: string;
  role: 'teacher' | 'parent';
  name: string;
}

export interface MessageThread {
  id: string;
  schoolId: string;
  studentId: string;
  studentName?: string;
  participants: ThreadParticipant[];
  subject: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  isClosed: boolean;
  createdAt: string;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: 'teacher' | 'parent';
  senderName: string;
  content: string;
  attachments?: { url: string; name: string; type: string; size: number }[];
  readBy: { userId: string; readAt: string }[];
  createdAt: string;
}

export interface CreateThreadPayload {
  recipientId: string;
  studentId: string;
  subject?: string;
  message: string;
}

export interface ThreadSendMessagePayload {
  content: string;
}

export interface ThreadDetail {
  thread: MessageThread;
  messages: ThreadMessage[];
  total: number;
}
