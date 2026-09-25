/**
 * A page's API traffic as a set: method + path, with ids, numbers and the query
 * stripped, so polling and different records don't count as a change.
 * The restyle must leave every in-scope page's set as it was (spec §7).
 */
const OBJECT_ID = /\b[0-9a-f]{24}\b/gi;
const NUMERIC_SEGMENT = /\/\d+(?=\/|$)/g;

export function normaliseRequest(method: string, url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.pathname.startsWith('/api/')) return null;
  const path = parsed.pathname.replace(OBJECT_ID, ':id').replace(NUMERIC_SEGMENT, '/:n').replace(/\/+$/, '');
  return `${method.toUpperCase()} ${path}`;
}

export function toRequestSet(entries: ReadonlyArray<{ method: string; url: string }>): string[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    const key = normaliseRequest(entry.method, entry.url);
    if (key) keys.add(key);
  }
  return [...keys].sort();
}

export function diffRequestSets(before: readonly string[], after: readonly string[]): { added: string[]; removed: string[] } {
  const had = new Set(before);
  const has = new Set(after);
  return { added: after.filter((k: string) => !had.has(k)), removed: before.filter((k: string) => !has.has(k)) };
}

/** Drops timer-driven keys. Applied to the baseline and to the live run alike, so a filtered key never reads as a change. */
export function withoutPolling(set: readonly string[], polling: readonly RegExp[]): string[] {
  return set.filter((k: string) => !polling.some((p: RegExp) => p.test(k)));
}

/**
 * Whether the page moved on to another path (e.g. /teacher/assignments sends a standalone teacher to /teacher/homework).
 * A redirecting page has no request set of its own: what it records depends on how far the redirect got.
 */
export function landedElsewhere(route: string, finalUrl: string): boolean {
  const trim = (p: string): string => p.replace(/\/+$/, '') || '/';
  let landed: string;
  try {
    landed = new URL(finalUrl).pathname;
  } catch {
    return false;
  }
  return trim(new URL(route, 'http://localhost').pathname) !== trim(landed);
}
