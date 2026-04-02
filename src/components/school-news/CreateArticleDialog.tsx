'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateArticlePayload, ArticleCategory } from '@/types';

const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: 'sports', label: 'Sports' },
  { value: 'academic', label: 'Academic' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'events', label: 'Events' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'general', label: 'General' },
];

interface CreateArticleDialogProps {
  onSubmit: (data: CreateArticlePayload) => Promise<void>;
}

export function CreateArticleDialog({ onSubmit }: CreateArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState<ArticleCategory>('general');
  const [coverImage, setCoverImage] = useState('');
  const [featured, setFeatured] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setContent('');
      setExcerpt('');
      setCategory('general');
      setCoverImage('');
      setFeatured(false);
      setTagsInput('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    try {
      setSubmitting(true);
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category,
        excerpt: excerpt.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        featured,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.success('Article created as draft');
      setOpen(false);
    } catch {
      toast.error('Failed to create article');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" />
        Write Article
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write Article</DialogTitle>
          <DialogDescription>Create a new school news article. It will be saved as a draft.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="article-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="article-title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Article headline"
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-category">Category <span className="text-destructive">*</span></Label>
            <Select
              value={category}
              onValueChange={(val: unknown) => setCategory(val as ArticleCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-excerpt">Excerpt</Label>
            <Textarea
              id="article-excerpt"
              value={excerpt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExcerpt(e.target.value)}
              placeholder="Short preview (auto-generated if left blank)"
              maxLength={500}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-content">Content <span className="text-destructive">*</span></Label>
            <Textarea
              id="article-content"
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              placeholder="Write your article here..."
              rows={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-cover">Cover Image URL</Label>
            <Input
              id="article-cover"
              value={coverImage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCoverImage(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-tags">Tags (comma-separated)</Label>
            <Input
              id="article-tags"
              value={tagsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
              placeholder="sport, achievement, term 1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={featured} onCheckedChange={setFeatured} id="article-featured" />
            <Label htmlFor="article-featured">Featured article</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
