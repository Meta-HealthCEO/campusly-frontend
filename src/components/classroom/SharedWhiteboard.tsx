'use client';

import { useRef } from 'react';
import { PenLine } from 'lucide-react';

interface SharedWhiteboardProps {
  sessionId: string;
}

export function SharedWhiteboard({ sessionId: _sessionId }: SharedWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    canvas.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.buttons !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <PenLine className="h-4 w-4" />
        <span className="font-medium text-foreground">Interactive Whiteboard</span>
        <span className="text-xs">— integrate tldraw + Yjs</span>
      </div>
      <div className="relative w-full rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden bg-white dark:bg-neutral-900">
        <canvas
          ref={canvasRef}
          width={1200}
          height={600}
          className="w-full touch-none cursor-crosshair"
          style={{ display: 'block' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        />
        <p className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none select-none">
          Basic drawing canvas — replace with tldraw for full collaboration
        </p>
      </div>
    </div>
  );
}
