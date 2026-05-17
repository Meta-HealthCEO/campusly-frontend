'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface BuddyMarkdownProps {
  content: string;
}

/**
 * Renders an assistant reply as Markdown with inline LaTeX math support.
 * Buddy is instructed via the system prompt to wrap math in `$...$` for
 * inline and `$$...$$` for blocks, which `remark-math` + `rehype-katex`
 * convert into nicely rendered KaTeX.
 */
export function BuddyMarkdown({ content }: BuddyMarkdownProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:my-2 [&_code]:text-xs [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
