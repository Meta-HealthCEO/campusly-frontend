'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GenerateArticlePayload, ArticleCategory, GenerationSourceType } from '@/types';

const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: 'sports', label: 'Sports' },
  { value: 'academic', label: 'Academic' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'events', label: 'Events' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'general', label: 'General' },
];

const SOURCE_TYPES: { value: GenerationSourceType; label: string; description: string }[] = [
  { value: 'sports_result', label: 'Sports Result', description: 'Generate from recent match results' },
  { value: 'achievement', label: 'Achievement', description: 'Celebrate student achievements' },
  { value: 'event_recap', label: 'Event Recap', description: 'Summarise a recent school event' },
  { value: 'term_highlights', label: 'Term Highlights', description: 'Best moments from the term' },
];

interface GenerateArticleDialogProps {
  onSubmit: (data: GenerateArticlePayload) => Promise<void>;
}

export function GenerateArticleDialog({ onSubmit }: GenerateArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [category, setCategory] = useState<ArticleCategory>('general');
  const [sourceType, setSourceType] = useState<GenerationSourceType>('sports_result');
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    if (open) {
      setCategory('general');
      setSourceType('sports_result');
      setCustomPrompt('');
    }
  }, [open]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await onSubmit({
        category,
        sourceType,
        customPrompt: customPrompt.trim() || undefined,
      });
      toast.success('Article generated! Check your drafts to review and publish.');
      setOpen(false);
    } catch {
      toast.error('Failed to generate article. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const selectedSource = SOURCE_TYPES.find((s) => s.value === sourceType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Sparkles className="h-4 w-4" />
        AI Generate
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Article with AI
          </DialogTitle>
          <DialogDescription>
            AI will generate a draft article from your school data. You can review and edit before publishing.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label>Article Type <span className="text-destructive">*</span></Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {SOURCE_TYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setSourceType(st.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    sourceType === st.value
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-medium">{st.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{st.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="custom-prompt">Additional Instructions (optional)</Label>
            <Textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Focus on the U14 rugby team's comeback, mention the captain by name..."
              rows={3}
              maxLength={1000}
            />
          </div>
          {selectedSource && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              AI will use your school&apos;s {selectedSource.label.toLowerCase()} data to write an engaging article.
              The generated article will be saved as a draft for your review.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Article
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
