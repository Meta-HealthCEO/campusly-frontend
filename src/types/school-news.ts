export type ArticleCategory =
  | 'sports'
  | 'academic'
  | 'cultural'
  | 'events'
  | 'achievements'
  | 'general';

export type ArticleSourceType = 'manual' | 'ai_generated';

export type ArticleStatus = 'draft' | 'published' | 'archived';

export type GenerationSourceType =
  | 'sports_result'
  | 'achievement'
  | 'event_recap'
  | 'term_highlights';

export interface NewsArticle {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  excerpt: string;
  category: ArticleCategory;
  coverImage?: string;
  authorId: string;
  authorName: string;
  sourceType: ArticleSourceType;
  status: ArticleStatus;
  publishedAt?: string;
  tags: string[];
  featured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticlePayload {
  title: string;
  content: string;
  category: ArticleCategory;
  excerpt?: string;
  tags?: string[];
  coverImage?: string;
  featured?: boolean;
}

export interface UpdateArticlePayload {
  title?: string;
  content?: string;
  category?: ArticleCategory;
  excerpt?: string;
  tags?: string[];
  coverImage?: string;
  featured?: boolean;
}

export interface GenerateArticlePayload {
  category: ArticleCategory;
  sourceType: GenerationSourceType;
  sourceId?: string;
  customPrompt?: string;
}
