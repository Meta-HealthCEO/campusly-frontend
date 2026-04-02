'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { NewsCard } from './NewsCard';
import { ArticleView } from './ArticleView';
import { useNewsFeed } from '@/hooks/useSchoolNews';
import { Newspaper } from 'lucide-react';
import type { NewsArticle } from '@/types';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'sports', label: 'Sports' },
  { value: 'academic', label: 'Academic' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'events', label: 'Events' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'general', label: 'General' },
];

interface NewsFeedProps {
  limit?: number;
}

export function NewsFeed({ limit }: NewsFeedProps) {
  const [category, setCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const { articles, loading } = useNewsFeed(category, limit);

  if (selectedArticle) {
    return (
      <ArticleView
        article={selectedArticle}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" onValueChange={(val: unknown) => setCategory(val as string)}>
        <TabsList className="flex-wrap">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            {loading ? (
              <LoadingSpinner />
            ) : articles.length === 0 ? (
              <EmptyState
                icon={Newspaper}
                title="No news articles"
                description="There are no published articles in this category yet."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    onClick={setSelectedArticle}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
