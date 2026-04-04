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
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
      >
        {block.content}
      </ReactMarkdown>
    </div>
  );
}
