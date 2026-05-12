'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { StudentLessonMaterial } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: StudentLessonMaterial | null;
}

export function LessonResourceReader({ open, onOpenChange, material }: Props) {
  if (!material) return null;
  const resource = material.contentResource;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{material.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
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
              className="w-full h-[60vh] rounded border"
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
          {resource?.type === 'markdown' && (
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
          {material.teacherNotes && (
            <div className="mt-4 rounded-md bg-muted p-3 text-sm">
              <strong>Teacher notes:</strong> {material.teacherNotes}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
