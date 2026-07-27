'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useExcalidrawCollaboration } from '@/hooks/useExcalidrawCollaboration';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

// Excalidraw touches `window` at module scope — client-only load.
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false, loading: () => <LoadingSpinner /> },
);

interface WhiteboardProps {
  sessionId: string;
  readOnly?: boolean;
}

export function SharedWhiteboard({ sessionId, readOnly }: WhiteboardProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const { handleChange } = useExcalidrawCollaboration(api, sessionId);

  return (
    <div className="h-full w-full min-h-[300px]">
      <Excalidraw
        excalidrawAPI={setApi}
        onChange={handleChange}
        viewModeEnabled={readOnly}
      />
    </div>
  );
}
