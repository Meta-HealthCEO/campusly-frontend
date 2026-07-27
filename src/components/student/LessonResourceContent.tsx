'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { useResourceBlockAttempts } from '@/hooks/useResourceBlockAttempts';
import { ExternalLink } from 'lucide-react';
import type {
  ContentBlockItem,
  ContentBlockType,
  StudentLessonMaterial,
} from '@/types';

const BLOCK_TYPES = new Set<ContentBlockType>([
  'text', 'image', 'video', 'quiz', 'drag_drop', 'fill_blank',
  'match_columns', 'ordering', 'hotspot', 'step_reveal', 'code',
]);

function normalizeBlock(raw: unknown, index: number): ContentBlockItem {
  const block = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const rawType = typeof block.type === 'string' ? block.type : 'text';
  const type = BLOCK_TYPES.has(rawType as ContentBlockType) ? (rawType as ContentBlockType) : 'text';
  return {
    blockId: typeof block.blockId === 'string' && block.blockId ? block.blockId : `student-block-${index}`,
    type,
    order: typeof block.order === 'number' ? block.order : index,
    content: typeof block.content === 'string' ? block.content : '',
    curriculumNodeId: typeof block.curriculumNodeId === 'string' ? block.curriculumNodeId : null,
    cognitiveLevel: (block.cognitiveLevel as ContentBlockItem['cognitiveLevel']) ?? null,
    points: typeof block.points === 'number' ? block.points : 0,
    hints: Array.isArray(block.hints) ? block.hints.map(String) : [],
    explanation: typeof block.explanation === 'string' ? block.explanation : '',
    metadata: block.metadata && typeof block.metadata === 'object'
      ? (block.metadata as Record<string, unknown>)
      : {},
  };
}

export function LessonResourceContent({ material }: { material: StudentLessonMaterial }) {
  const resource = material.contentResource;
  // Interactive blocks submit through the mastery API (with a local-grading
  // fallback), so quiz answers inside lessons count toward mastery.
  const { getInteraction, submitBlockAttempt } = useResourceBlockAttempts(resource?.id);
  const blocks = (resource?.blocks ?? [])
    .map(normalizeBlock)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {!resource && (
        <p className="text-sm text-muted-foreground">
          No content attached to this material.
        </p>
      )}
      {resource?.type === 'video' && resource.url && (
        <video controls className="w-full rounded">
          <source src={resource.url} />
        </video>
      )}
      {resource?.type === 'pdf' && resource.url && (
        <iframe
          src={resource.url}
          className="w-full h-[75vh] rounded border"
          title={resource.title}
        />
      )}
      {resource?.type === 'link' && resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" /> Open external link
        </a>
      )}
      {blocks.length > 0 && (
        <div className="space-y-4">
          {blocks.map((block) => (
            <div key={block.blockId} className="rounded-lg border p-4">
              <BlockRenderer
                block={block}
                onAttempt={(blockId, response) => {
                  const target = blocks.find((b) => b.blockId === blockId) ?? block;
                  return submitBlockAttempt(target, response);
                }}
                interaction={getInteraction(block.blockId)}
              />
            </div>
          ))}
        </div>
      )}
      {blocks.length === 0 && resource?.type === 'markdown' && (
        <article
          className="
            max-w-none text-sm leading-relaxed text-foreground
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
            [&_p]:mb-3 [&_p]:leading-relaxed
            [&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1
            [&_ol]:mb-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1
            [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
            [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4
            [&_strong]:font-semibold
            [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto
          "
        >
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
          >
            {resource.url ?? ''}
          </ReactMarkdown>
        </article>
      )}
      {resource && blocks.length === 0 && !resource.url && resource.type !== 'markdown' && (
        <p className="text-sm text-muted-foreground">
          No readable content blocks are attached to this material yet.
        </p>
      )}
      {material.teacherNotes && (
        <div className="mt-4 rounded-md bg-muted p-3 text-sm">
          <strong>Teacher notes:</strong> {material.teacherNotes}
        </div>
      )}
    </div>
  );
}
