'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { TextbookSidebar } from '@/components/textbook/TextbookSidebar';
import { useTextbooks } from '@/hooks/useTextbooks';
import { useStudentLearning } from '@/hooks/useStudentLearning';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import type {
  TextbookItem,
  ChapterItem,
  ContentResourceItem,
  ContentBlockItem,
  BlockInteractionState,
  AttemptResult,
} from '@/types';

const INTERACTIVE_TYPES = new Set(['quiz', 'fill_blank', 'match_columns', 'ordering']);

function createDefaultInteraction(blockId: string): BlockInteractionState {
  return { blockId, answered: false, correct: null, score: 0, maxScore: 0, showExplanation: false, hintsRevealed: 0, attemptResult: null };
}

function resolveCurriculumNodeId(resource: ContentResourceItem | undefined): string {
  if (!resource) return '';
  if (typeof resource.curriculumNodeId === 'string') return resource.curriculumNodeId;
  if (typeof resource.curriculumNodeId === 'object' && resource.curriculumNodeId) return resource.curriculumNodeId.id;
  return '';
}

export default function TextbookReaderPage() {
  const params = useParams();
  const textbookId = params.textbookId as string;
  const { getTextbook } = useTextbooks();
  const { getResource, submitAttempt } = useStudentLearning();
  const { student } = useCurrentStudent();

  const [textbook, setTextbook] = useState<TextbookItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [chapterResources, setChapterResources] = useState<ContentResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(new Map());
  const interactionsRef = useRef(interactions);
  interactionsRef.current = interactions;

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
    () => textbook ? [...textbook.chapters].sort((a: ChapterItem, b: ChapterItem) => a.order - b.order) : [],
    [textbook],
  );
  const currentChapter = sortedChapters[chapterIdx] ?? null;

  const loadChapterResources = useCallback(async (chapter: ChapterItem) => {
    setResourcesLoading(true);
    setChapterResources([]);
    setInteractions(new Map());
    try {
      const sorted = [...chapter.resources].sort((a, b) => a.order - b.order);
      const loaded = await Promise.all(
        sorted.map((r) => {
          const id = typeof r.resourceId === 'string' ? r.resourceId : r.resourceId.id;
          return getResource(id);
        }),
      );
      setChapterResources(loaded);
      const map = new Map<string, BlockInteractionState>();
      loaded.forEach((res: ContentResourceItem) => {
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

  const handleAttempt = useCallback(
    async (blockId: string, response: string): Promise<AttemptResult> => {
      if (!student?.id) throw new Error('Student not loaded');
      const resource = chapterResources.find((r: ContentResourceItem) =>
        r.blocks.some((b: ContentBlockItem) => b.blockId === blockId),
      );
      const payload = {
        blockId,
        curriculumNodeId: resolveCurriculumNodeId(resource),
        response,
        timeSpentSeconds: 0,
        hintsUsed: interactionsRef.current.get(blockId)?.hintsRevealed ?? 0,
      };
      const result = await submitAttempt(resource?.id ?? '', student.id, payload);
      setInteractions((prev) => {
        const next = new Map(prev);
        next.set(blockId, {
          blockId, answered: true, correct: result.correct, score: result.score,
          maxScore: result.maxScore, showExplanation: true,
          hintsRevealed: prev.get(blockId)?.hintsRevealed ?? 0, attemptResult: result,
        });
        return next;
      });
      return result;
    },
    [student?.id, chapterResources, submitAttempt],
  );

  const goToChapter = useCallback((idx: number) => {
    setChapterIdx(idx);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!textbook) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Textbook not found"
        description="This textbook may have been removed."
        action={
          <Link href="/student/learn/textbooks">
            <Button variant="outline">Back to Textbooks</Button>
          </Link>
        }
      />
    );
  }

  if (sortedChapters.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/student/learn/textbooks">
            <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
          </Link>
          <PageHeader title={textbook.title} />
        </div>
        <EmptyState icon={BookOpen} title="No chapters" description="This textbook has no content yet." />
      </div>
    );
  }

  const allBlocks = chapterResources.flatMap((r: ContentResourceItem) =>
    [...r.blocks].sort((a: ContentBlockItem, b: ContentBlockItem) => a.order - b.order),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/student/learn/textbooks">
          <Button variant="ghost" size="icon"><ChevronLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <PageHeader title={textbook.title} />
        </div>
        <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setSidebarOpen((o) => !o)} aria-label="Table of contents">
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

          <div className="flex justify-between pt-4">
            <Button variant="outline" disabled={chapterIdx === 0} onClick={() => goToChapter(chapterIdx - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" disabled={chapterIdx >= sortedChapters.length - 1} onClick={() => goToChapter(chapterIdx + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
