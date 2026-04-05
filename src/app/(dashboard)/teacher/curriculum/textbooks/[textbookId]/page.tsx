'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft, List, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { TextbookSidebar } from '@/components/textbook/TextbookSidebar';
import { useTextbooks } from '@/hooks/useTextbooks';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import type {
  TextbookItem, ChapterItem, ContentResourceItem,
  ContentBlockItem, BlockInteractionState, AttemptResult,
} from '@/types';

const INTERACTIVE_TYPES = new Set(['quiz', 'fill_blank', 'match_columns', 'ordering']);

function createDefaultInteraction(blockId: string): BlockInteractionState {
  return { blockId, answered: false, correct: null, score: 0, maxScore: 0, showExplanation: false, hintsRevealed: 0, attemptResult: null };
}

export default function TeacherTextbookReaderPage() {
  const params = useParams();
  const textbookId = params.textbookId as string;
  const { getTextbook } = useTextbooks();
  const { getResource } = useContentLibrary();

  const [textbook, setTextbook] = useState<TextbookItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [chapterResources, setChapterResources] = useState<ContentResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(new Map());

  useEffect(() => {
    if (!textbookId) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await getTextbook(textbookId);
        if (!cancelled && data) setTextbook(data);
      } catch (err: unknown) {
        console.error('Failed to load textbook', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [textbookId, getTextbook]);

  const sortedChapters = useMemo(
    () => textbook?.chapters ? [...textbook.chapters].sort((a: ChapterItem, b: ChapterItem) => a.order - b.order) : [],
    [textbook],
  );
  const currentChapter = sortedChapters[chapterIdx] ?? null;

  const loadChapterResources = useCallback(async (chapter: ChapterItem) => {
    setResourcesLoading(true);
    setChapterResources([]);
    setInteractions(new Map());
    try {
      const sorted = [...chapter.resources].sort((a, b) => a.order - b.order);
      const loaded: ContentResourceItem[] = [];
      for (const r of sorted) {
        const id = typeof r.resourceId === 'string' ? r.resourceId : r.resourceId.id;
        const resource = await getResource(id);
        if (resource) loaded.push(resource);
      }
      setChapterResources(loaded);
      const map = new Map<string, BlockInteractionState>();
      loaded.forEach((res) => {
        (res.blocks ?? []).forEach((block: ContentBlockItem) => {
          if (INTERACTIVE_TYPES.has(block.type)) {
            map.set(block.blockId, createDefaultInteraction(block.blockId));
          }
        });
      });
      setInteractions(map);
    } catch (err: unknown) {
      console.error('Failed to load chapter resources', err);
    } finally {
      setResourcesLoading(false);
    }
  }, [getResource]);

  useEffect(() => {
    if (currentChapter && currentChapter.resources.length > 0) {
      loadChapterResources(currentChapter);
    } else {
      setChapterResources([]);
      setInteractions(new Map());
    }
  }, [currentChapter, loadChapterResources]);

  // Preview-mode: don't save attempts
  const handleAttempt = useCallback(
    async (blockId: string, _response: string): Promise<AttemptResult> => {
      const result: AttemptResult = {
        id: `preview-${blockId}`, correct: true, score: 1, maxScore: 1, attemptNumber: 1,
      };
      setInteractions((prev) => {
        const next = new Map(prev);
        next.set(blockId, {
          blockId, answered: true, correct: true, score: 1, maxScore: 1,
          showExplanation: true, hintsRevealed: 0, attemptResult: result,
        });
        return next;
      });
      return result;
    },
    [],
  );

  const goToChapter = useCallback((idx: number) => {
    setChapterIdx(idx);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!textbook) {
    return (
      <EmptyState icon={BookOpen} title="Textbook not found" description="This textbook may have been removed."
        action={<Link href="/teacher/curriculum/textbooks"><Button variant="outline">Back to Textbooks</Button></Link>}
      />
    );
  }

  if (sortedChapters.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/teacher/curriculum/textbooks"><Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button></Link>
          <PageHeader title={textbook.title} />
        </div>
        <EmptyState icon={BookOpen} title="No chapters" description="This textbook has no content yet." />
      </div>
    );
  }

  const allBlocks = chapterResources.flatMap((r) =>
    [...r.blocks].sort((a: ContentBlockItem, b: ContentBlockItem) => a.order - b.order),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/teacher/curriculum/textbooks">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <PageHeader title={textbook.title} />
        </div>
        <Badge variant="outline" className="gap-1 shrink-0">
          <Eye className="size-3" /> Preview
        </Badge>
        <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setSidebarOpen((o) => !o)}>
          <List className="h-5 w-5" />
        </Button>
      </div>

      <Badge variant="secondary" className="text-xs">
        Chapter {chapterIdx + 1} of {sortedChapters.length}
      </Badge>

      <div className="flex gap-6">
        <TextbookSidebar
          chapters={sortedChapters}
          activeIndex={chapterIdx}
          sidebarOpen={sidebarOpen}
          onSelectChapter={goToChapter}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h2 className="text-lg font-bold">{currentChapter?.title}</h2>
            {currentChapter?.description && (
              <p className="text-sm text-muted-foreground mt-1">{currentChapter.description}</p>
            )}
          </div>

          {resourcesLoading ? (
            <LoadingSpinner />
          ) : allBlocks.length === 0 ? (
            <EmptyState icon={BookOpen} title="No content" description="This chapter has no content blocks yet." />
          ) : (
            <div className="space-y-4">
              {allBlocks.map((block: ContentBlockItem) => (
                <Card key={block.blockId}>
                  <CardContent>
                    <BlockRenderer
                      block={block}
                      onAttempt={handleAttempt}
                      interaction={interactions.get(block.blockId) ?? createDefaultInteraction(block.blockId)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" disabled={chapterIdx === 0} onClick={() => goToChapter(chapterIdx - 1)}>
              ← Previous Chapter
            </Button>
            <span className="text-sm text-muted-foreground">
              {chapterIdx + 1} / {sortedChapters.length}
            </span>
            <Button variant="outline" disabled={chapterIdx >= sortedChapters.length - 1} onClick={() => goToChapter(chapterIdx + 1)}>
              Next Chapter →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
