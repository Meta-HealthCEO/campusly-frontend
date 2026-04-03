'use client';

import type { ContentBlockItem } from '@/types';

interface TextBlockProps {
  block: ContentBlockItem;
}

export function TextBlock({ block }: TextBlockProps) {
  const paragraphs = block.content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert space-y-3">
      {paragraphs.map((paragraph, idx) => {
        // Detect headings (lines starting with #)
        const headingMatch = paragraph.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          if (level === 1) return <h2 key={idx} className="text-xl font-bold">{text}</h2>;
          if (level === 2) return <h3 key={idx} className="text-lg font-semibold">{text}</h3>;
          return <h4 key={idx} className="text-base font-semibold">{text}</h4>;
        }

        // Detect bullet lists
        const lines = paragraph.split('\n');
        const isList = lines.every((l) => /^[-*]\s/.test(l));
        if (isList) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {lines.map((line, li) => (
                <li key={li} className="text-sm text-muted-foreground">
                  {line.replace(/^[-*]\s/, '')}
                </li>
              ))}
            </ul>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}
