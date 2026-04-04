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
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-bold prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2 prose-p:leading-relaxed prose-li:leading-relaxed prose-table:text-sm prose-blockquote:border-primary/30 prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-strong:text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
      >
        {block.content}
      </ReactMarkdown>
    </div>
  );
}
