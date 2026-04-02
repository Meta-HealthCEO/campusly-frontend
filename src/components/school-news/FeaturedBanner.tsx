'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArticleView } from './ArticleView';
import { useFeaturedArticles } from '@/hooks/useSchoolNews';
import { formatRelativeDate } from '@/lib/utils';
import type { NewsArticle } from '@/types';

interface FeaturedBannerProps {
  limit?: number;
}

export function FeaturedBanner({ limit = 3 }: FeaturedBannerProps) {
  const { articles, loading } = useFeaturedArticles(limit);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  if (selectedArticle) {
    return (
      <ArticleView
        article={selectedArticle}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  if (loading) return <LoadingSpinner />;
  if (articles.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          School News
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {articles.map((article) => (
          <button
            key={article.id}
            type="button"
            className="w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            onClick={() => setSelectedArticle(article)}
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {article.category}
                </Badge>
                {article.featured && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    Featured
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium truncate">{article.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatRelativeDate(article.publishedAt ?? article.createdAt)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 mt-2 text-muted-foreground" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
