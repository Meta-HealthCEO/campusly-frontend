'use client';

import { useEffect, useRef, useState } from 'react';
import type { ContentBlockItem } from '@/types';

interface MermaidBlockProps {
  block: ContentBlockItem;
}

export function MermaidBlock({ block }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });

        const id = `mermaid-${block.blockId}`;
        const { svg: renderedSvg } = await mermaid.render(id, block.content);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError('');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    }

    if (block.content.trim()) {
      render();
    }

    return () => { cancelled = true; };
  }, [block.content, block.blockId]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        Diagram error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        ref={containerRef}
        className="flex justify-center py-2"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {typeof block.metadata?.caption === 'string' && (
        <p className="text-center text-xs text-muted-foreground mt-2">
          {block.metadata.caption}
        </p>
      )}
    </div>
  );
}
