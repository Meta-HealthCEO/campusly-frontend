'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ContentBlockItem } from '@/types';

interface MermaidBlockProps {
  block: ContentBlockItem;
}

export function MermaidBlock({ block }: MermaidBlockProps) {
  const { resolvedTheme } = useTheme();
  const mermaidTheme = resolvedTheme === 'dark' ? 'dark' : 'default';

  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: mermaidTheme,
          securityLevel: 'loose',
          fontFamily: 'inherit',
          flowchart: { useMaxWidth: false },
          sequence: { useMaxWidth: false },
          class: { useMaxWidth: false },
          state: { useMaxWidth: false },
          er: { useMaxWidth: false },
          gantt: { useMaxWidth: false },
          pie: { useMaxWidth: false },
        });

        // Each render needs a unique id so re-renders on theme change don't conflict
        // with the previous render's element in the DOM.
        const id = `mermaid-${block.blockId}-${mermaidTheme}-${Date.now()}`;
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
      void render();
    }

    return () => { cancelled = true; };
  }, [block.content, block.blockId, mermaidTheme]);

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

  const caption = typeof block.metadata?.caption === 'string' ? block.metadata.caption : null;

  return (
    <>
      <div className="overflow-x-auto">
        <button
          type="button"
          onClick={() => setEnlarged(true)}
          className="block w-full cursor-zoom-in py-2"
          aria-label="Enlarge diagram"
        >
          <div
            className="flex justify-center"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </button>
        {caption && (
          <p className="text-center text-xs text-muted-foreground mt-2">{caption}</p>
        )}
      </div>

      <Dialog open={enlarged} onOpenChange={setEnlarged}>
        <DialogContent className="flex flex-col max-h-[95vh] sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="truncate">
              {caption ?? 'Diagram'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md bg-white p-6">
            <div
              className="flex justify-center"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setEnlarged(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
