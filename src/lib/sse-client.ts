/**
 * Minimal POST-based SSE client. The browser's built-in EventSource only
 * supports GET and can't set Authorization headers, so we read the raw
 * `text/event-stream` body with `fetch` + a streaming TextDecoder and parse
 * `event:` / `data:` frames ourselves.
 *
 * Each `data:` frame is expected to be JSON. Unknown event names are ignored.
 */

export interface SSEHandlers<EventMap> {
  onEvent: <K extends keyof EventMap>(name: K, data: EventMap[K]) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export async function postEventStream<EventMap>(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  handlers: SSEHandlers<EventMap>,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
    credentials: 'include',
    signal: handlers.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Stream failed: ${response.status} ${text}`);
  }
  if (!response.body) {
    throw new Error('Stream response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'message';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawFrame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        currentEvent = parseFrame(rawFrame, currentEvent, (event, data) => {
          try {
            const parsed = data === '' ? null : (JSON.parse(data) as EventMap[keyof EventMap]);
            handlers.onEvent(event as keyof EventMap, parsed as EventMap[keyof EventMap]);
          } catch (err: unknown) {
            handlers.onError?.(err instanceof Error ? err : new Error('Failed to parse SSE frame'));
          }
        });
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(
  raw: string,
  defaultEvent: string,
  dispatch: (event: string, data: string) => void,
): string {
  let event = defaultEvent;
  const dataLines: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length > 0) {
    dispatch(event, dataLines.join('\n'));
  }
  return defaultEvent; // reset to default for the next frame
}
