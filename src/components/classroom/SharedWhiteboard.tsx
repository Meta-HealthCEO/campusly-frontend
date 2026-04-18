'use client';

import { Tldraw, useEditor } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useYjsCollaboration } from '@/hooks/useYjsCollaboration';

interface WhiteboardProps {
  sessionId: string;
  readOnly?: boolean;
}

function YjsSyncInner({ sessionId }: { sessionId: string }) {
  const editor = useEditor();
  useYjsCollaboration(editor, sessionId);
  return null;
}

export function SharedWhiteboard({ sessionId, readOnly }: WhiteboardProps) {
  return (
    <div className="h-full w-full min-h-[300px]">
      <Tldraw autoFocus={!readOnly} hideUi={readOnly}>
        <YjsSyncInner sessionId={sessionId} />
      </Tldraw>
    </div>
  );
}
