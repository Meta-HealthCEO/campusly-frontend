'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import type { ExcalidrawImperativeAPI, ExcalidrawProps } from '@excalidraw/excalidraw/types';

type SceneElements = Parameters<NonNullable<ExcalidrawProps['onChange']>>[0];

const PUSH_DEBOUNCE_MS = 500;

function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4500/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

/**
 * Syncs an Excalidraw scene with other participants via Yjs over Socket.IO.
 * Snapshot-based: local changes are debounced and pushed as a serialized
 * element array into a shared Yjs map; remote updates are applied through
 * the imperative API. Loop-protection via a last-synced marker + suppress
 * flag around remote applies.
 */
export function useExcalidrawCollaboration(
  api: ExcalidrawImperativeAPI | null,
  sessionId: string,
): { handleChange: (elements: SceneElements) => void } {
  const suppressRef = useRef(false);
  const lastSyncedRef = useRef('');
  const yMapRef = useRef<Y.Map<unknown> | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!api || !sessionId) return;

    const doc = new Y.Doc();
    const provider = new SocketIOProvider(
      getSocketUrl(),
      `whiteboard-${sessionId}`,
      doc,
      { autoConnect: true, resyncInterval: 5000 },
    );

    const yMap = doc.getMap('excalidraw');
    yMapRef.current = yMap;

    /* Pull remote changes into the local scene */
    const observer = () => {
      const raw = yMap.get('elements');
      if (typeof raw !== 'string' || raw === lastSyncedRef.current) return;
      try {
        const elements = JSON.parse(raw) as SceneElements;
        lastSyncedRef.current = raw;
        suppressRef.current = true;
        api.updateScene({ elements });
      } catch (err: unknown) {
        console.error('Failed to apply whiteboard update', err);
      } finally {
        // Release after the resulting onChange has fired.
        window.setTimeout(() => { suppressRef.current = false; }, 0);
      }
    };
    yMap.observe(observer);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      yMap.unobserve(observer);
      yMapRef.current = null;
      provider.disconnect();
      doc.destroy();
    };
  }, [api, sessionId]);

  /* Push local changes to Yjs (debounced) */
  const handleChange = useCallback((elements: SceneElements) => {
    if (suppressRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      const yMap = yMapRef.current;
      if (!yMap) return;
      const serialized = JSON.stringify(elements);
      if (serialized === lastSyncedRef.current) return;
      lastSyncedRef.current = serialized;
      yMap.set('elements', serialized);
    }, PUSH_DEBOUNCE_MS);
  }, []);

  return { handleChange };
}
