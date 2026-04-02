'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Calendar } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import type { NewsArticle, ArticleCategory } from '@/types';

const categoryColors: Record<ArticleCategory, string> = {
  sports: 'bg-emerald-100 text-emerald-800',
  academic: 'bg-blue-100 text-blue-800',
  cultural: 'bg-purple-100 text-purple-800',
  events: 'bg-amber-100 text-amber-800',
  achievements: 'bg-yellow-100 text-yellow-800',
  general: 'bg-muted text-muted-foreground',
};

interface NewsCardProps {
  article: NewsArticle;
  onClick?: (article: NewsArticle) => void;
}

export function NewsCard({ article, onClick }: NewsCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md overflow-hidden"
      onClick={() => onClick?.(article)}
    >
      {article.coverImage && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={article.coverImage}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className={categoryColors[article.category] ?? ''}
          >
            {article.category}
          </Badge>
          {article.featured && (
            <Badge variant="default" className="bg-primary text-primary-foreground">
              Featured
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-base line-clamp-2">{article.title}</h3>
        {article.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatRelativeDate(article.publishedAt ?? article.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{article.viewCount}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">By {article.authorName}</p>
      </CardContent>
    </Card>
  );
}
