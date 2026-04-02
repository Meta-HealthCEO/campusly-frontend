'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CreateArticleDialog } from '@/components/school-news/CreateArticleDialog';
import { GenerateArticleDialog } from '@/components/school-news/GenerateArticleDialog';
import { ArticleView } from '@/components/school-news/ArticleView';
import { useSchoolNewsAdmin, useSchoolNewsMutations } from '@/hooks/useSchoolNews';
import {
  Newspaper, Search, Eye, MoreHorizontal,
  CheckCircle, Archive, Trash2, Calendar, Sparkles,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger,
  DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { NewsArticle, ArticleStatus } from '@/types';

const statusColors: Record<ArticleStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-muted text-muted-foreground',
};

export default function SchoolNewsAdminPage() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const filters = useMemo(() => ({
    category: categoryFilter,
    status: statusFilter,
    search: search.trim() || undefined,
  }), [categoryFilter, statusFilter, search]);

  const { articles, loading, fetchArticles } = useSchoolNewsAdmin(filters);
  const {
    createArticle, generateArticle,
    publishArticle, archiveArticle, deleteArticle,
  } = useSchoolNewsMutations();

  const handleCreate = useCallback(async (data: Parameters<typeof createArticle>[0]) => {
    await createArticle(data);
    fetchArticles();
  }, [createArticle, fetchArticles]);

  const handleGenerate = useCallback(async (data: Parameters<typeof generateArticle>[0]) => {
    await generateArticle(data);
    fetchArticles();
  }, [generateArticle, fetchArticles]);

  const handlePublish = useCallback(async (id: string) => {
    try {
      await publishArticle(id);
      toast.success('Article published');
      fetchArticles();
    } catch {
      toast.error('Failed to publish article');
    }
  }, [publishArticle, fetchArticles]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await archiveArticle(id);
      toast.success('Article archived');
      fetchArticles();
    } catch {
      toast.error('Failed to archive article');
    }
  }, [archiveArticle, fetchArticles]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteArticle(id);
      toast.success('Article deleted');
      fetchArticles();
    } catch {
      toast.error('Failed to delete article');
    }
  }, [deleteArticle, fetchArticles]);

  if (selectedArticle) {
    return (
      <div className="space-y-6">
        <ArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="School News"
        description="Manage news articles for your school website and parent feed."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v: unknown) => setCategoryFilter(v as string)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="cultural">Cultural</SelectItem>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="achievements">Achievements</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as string)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <GenerateArticleDialog onSubmit={handleGenerate} />
          <CreateArticleDialog onSubmit={handleCreate} />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No articles yet"
          description="Create your first article or let AI generate one from your school data."
        />
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={statusColors[article.status]}>
                      {article.status}
                    </Badge>
                    <Badge variant="outline">{article.category}</Badge>
                    {article.sourceType === 'ai_generated' && (
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </Badge>
                    )}
                    {article.featured && <Badge variant="default">Featured</Badge>}
                  </div>
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <h3 className="font-medium truncate hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                  </button>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{article.authorName}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(article.publishedAt ?? article.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.viewCount}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedArticle(article)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    {article.status === 'draft' && (
                      <DropdownMenuItem onClick={() => handlePublish(article.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Publish
                      </DropdownMenuItem>
                    )}
                    {article.status === 'published' && (
                      <DropdownMenuItem onClick={() => handleArchive(article.id)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(article.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
