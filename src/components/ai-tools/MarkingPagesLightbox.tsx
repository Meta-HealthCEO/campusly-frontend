'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getMarkingImageUrl } from '@/lib/api-helpers';

interface LightboxImage {
  filename: string;
  pageNumber: number;
}

interface MarkingPagesLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markingId: string;
  images: LightboxImage[];
  startIndex?: number;
}


export function MarkingPagesLightbox({
  open,
  onOpenChange,
  markingId,
  images,
  startIndex = 0,
}: MarkingPagesLightboxProps) {
  const ordered = [...images].sort((a, b) => a.pageNumber - b.pageNumber);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIndex((i) => Math.min(ordered.length - 1, i + 1)),
    [ordered.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prev, next]);

  if (ordered.length === 0) return null;
  const current = ordered[index];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] max-h-[95vh] flex flex-col p-0 bg-black/95 border-0"
      >
        <div className="flex items-center justify-between px-4 py-2 text-white text-sm">
          <span>
            Page {index + 1} of {ordered.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
          <Button
            variant="ghost"
            size="icon"
            disabled={index === 0}
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <img
            src={getMarkingImageUrl(markingId, current.filename)}
            alt={`Page ${current.pageNumber}`}
            className="max-h-[80vh] max-w-[85vw] object-contain"
          />
          <Button
            variant="ghost"
            size="icon"
            disabled={index === ordered.length - 1}
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
