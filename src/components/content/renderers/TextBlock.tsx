'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { ContentBlockItem } from '@/types';

interface TextBlockProps {
  block: ContentBlockItem;
}

export function TextBlock({ block }: TextBlockProps) {
  return (
    <article
      className="
        max-w-none text-sm leading-relaxed text-foreground
        [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3
        [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
        [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2
        [&_p]:mb-3 [&_p]:leading-relaxed
        [&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1
        [&_ol]:mb-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1
        [&_li]:leading-relaxed
        [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30
        [&_blockquote]:bg-primary/5 [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg
        [&_blockquote]:text-sm [&_blockquote]:italic
        [&_table]:w-full [&_table]:my-4 [&_table]:text-sm [&_table]:border-collapse
        [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
        [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
        [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
        [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4
        [&_strong]:font-semibold [&_strong]:text-foreground
        [&_em]:italic
        [&_hr]:my-6 [&_hr]:border-border
        [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
      >
        {block.content}
      </ReactMarkdown>
    </article>
  );
}
