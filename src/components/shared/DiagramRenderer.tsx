'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { QuestionDiagram } from '@/types/diagram';

// ─── API Base ──────────────────────────────────────────────────────────────
// Strip trailing /api so we get the raw backend origin for static files
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api').replace(/\/api\/?$/, '');

// ─── Types ──────────────────────────────────────────────────────────────────

interface DiagramRendererProps {
  diagram: QuestionDiagram | null;
  size?: 'sm' | 'md' | 'lg' | 'full';
  printMode?: boolean;
  className?: string;
}

// ─── Size Map ───────────────────────────────────────────────────────────────

const sizeClasses: Record<NonNullable<DiagramRendererProps['size']>, string> = {
  sm: 'max-w-xs',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'w-full',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function DiagramRenderer({
  diagram,
  size = 'md',
  printMode = false,
  className = '',
}: DiagramRendererProps) {
  const [imgError, setImgError] = useState(false);

  if (!diagram) return null;

  const sizeClass = sizeClasses[size];

  // Pending state — skeleton placeholder
  if (diagram.renderStatus === 'pending') {
    return (
      <div
        className={`${sizeClass} animate-pulse rounded-md bg-muted ${className}`}
        role="status"
        aria-label="Diagram loading"
      >
        <div className="flex aspect-video items-center justify-center">
          <span className="text-sm text-muted-foreground">Rendering diagram...</span>
        </div>
      </div>
    );
  }

  // Determine the image URL to use — prepend backend origin for relative paths
  const rawUrl = printMode && diagram.pdfUrl ? diagram.pdfUrl : diagram.svgUrl;
  const imageUrl = rawUrl?.startsWith('/') ? `${API_ORIGIN}${rawUrl}` : rawUrl;

  // Failed state, missing URL, or image load error — fallback
  if (diagram.renderStatus === 'failed' || !imageUrl || imgError) {
    return (
      <div
        className={`${sizeClass} rounded-md border border-border bg-muted/50 ${className}`}
        role="img"
        aria-label={diagram.alt}
      >
        <div className="flex aspect-video flex-col items-center justify-center gap-2 p-4">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-center text-sm text-muted-foreground line-clamp-3">
            {diagram.alt}
          </p>
          {diagram.renderStatus === 'failed' && diagram.renderError && (
            <p className="text-center text-xs text-destructive line-clamp-2">
              {diagram.renderError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Rendered state — show image
  return (
    <div className={`${sizeClass} rounded-md border border-border bg-white ${className}`}>
      <img
        src={imageUrl}
        alt={diagram.alt}
        loading="lazy"
        onError={() => setImgError(true)}
        className="h-auto w-full rounded-md"
      />
    </div>
  );
}
