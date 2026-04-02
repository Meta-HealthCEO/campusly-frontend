// ─── Notice Board Types ────────────────────────────────────────────────────

export type PostScope = 'class' | 'grade' | 'school';

export interface NoticeBoardAttachment {
  url: string;
  name: string;
  type: string;
}

export interface NoticeBoardPost {
  id: string;
  schoolId: string;
  scope: PostScope;
  scopeId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  title: string;
  content: string;
  pinned: boolean;
  attachments: NoticeBoardAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoticeBoardPostInput {
  scope: PostScope;
  scopeId: string;
  title: string;
  content: string;
  pinned?: boolean;
  attachments?: NoticeBoardAttachment[];
}

export interface UpdateNoticeBoardPostInput {
  title?: string;
  content?: string;
  pinned?: boolean;
}

export interface NoticeBoardListResponse {
  data: NoticeBoardPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
