'use client';

import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import type { Editor } from '@tldraw/tldraw';

function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4500/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

/**
 * Syncs a tldraw Editor with other participants via Yjs over Socket.IO.
 * Uses a simple snapshot-based sync: periodically pushes/pulls the full
 * editor snapshot via a shared Yjs map. This is less granular than
 * record-level sync but works reliably for Phase 1.
 */
export function useYjsCollaboration(editor: Editor | null, sessionId: string): void {
  const suppressRef = useRef(false);

  useEffect(() => {
    if (!editor || !sessionId) return;

    const doc = new Y.Doc();
    const provider = new SocketIOProvider(
      getSocketUrl(),
      `whiteboard-${sessionId}`,
      doc,
      { autoConnect: true, resyncInterval: 5000 },
    );

    const yMap = doc.getMap('tldraw');

    /* Push local changes to Yjs (debounced) */
    let pushTimer: ReturnType<typeof setTimeout> | null = null;

    const unlisten = editor.store.listen(
      () => {
        if (suppressRef.current) return;
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
          const snapshot = editor.store.getStoreSnapshot('document');
          yMap.set('snapshot', JSON.stringify(snapshot));
        }, 500);
      },
      { source: 'user', scope: 'document' },
    );

    /* Pull remote changes from Yjs */
    const observer = () => {
      const raw = yMap.get('snapshot');
      if (typeof raw !== 'string') return;
      try {
        const snapshot = JSON.parse(raw) as ReturnType<typeof editor.store.getStoreSnapshot>;
        suppressRef.current = true;
        editor.store.loadStoreSnapshot(snapshot);
      } catch (err: unknown) {
        console.error('Failed to apply Yjs snapshot', err);
      } finally {
        suppressRef.current = false;
      }
    };
    yMap.observe(observer);

    return () => {
      if (pushTimer) clearTimeout(pushTimer);
      unlisten();
      yMap.unobserve(observer);
      provider.disconnect();
      doc.destroy();
    };
  }, [editor, sessionId]);
}
