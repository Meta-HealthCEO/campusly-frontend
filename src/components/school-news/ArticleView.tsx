'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Eye, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { NewsArticle, ArticleCategory } from '@/types';

const categoryColors: Record<ArticleCategory, string> = {
  sports: 'bg-emerald-100 text-emerald-800',
  academic: 'bg-blue-100 text-blue-800',
  cultural: 'bg-purple-100 text-purple-800',
  events: 'bg-amber-100 text-amber-800',
  achievements: 'bg-yellow-100 text-yellow-800',
  general: 'bg-muted text-muted-foreground',
};

interface ArticleViewProps {
  article: NewsArticle;
  onBack: () => void;
}

export function ArticleView({ article, onBack }: ArticleViewProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to News
      </Button>

      {article.coverImage && (
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <img
            src={article.coverImage}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={categoryColors[article.category] ?? ''}>
            {article.category}
          </Badge>
          {article.featured && (
            <Badge variant="default">Featured</Badge>
          )}
          {article.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold">{article.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{article.authorName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(article.publishedAt ?? article.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{article.viewCount} views</span>
          </div>
        </div>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        {article.content.split('\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
