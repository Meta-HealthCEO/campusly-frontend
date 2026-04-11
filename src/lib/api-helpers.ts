/**
 * Shared API response helpers.
 * Used in hooks to centralise _id -> id mapping, response unwrapping,
 * and error extraction.
 */

/** Map `_id` to `id` on a single record. */
export function mapId<T extends Record<string, unknown>>(item: T): T & { id: string } {
  return { ...item, id: (item._id as string) ?? (item.id as string) ?? '' };
}

/**
 * Loose record type for unwrapped responses where properties are accessed
 * dynamically and may be arrays, objects, or primitives.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiRecord = Record<string, any>;

/** Unwrap a single-object response from the backend envelope. */
export function unwrapResponse<T = ApiRecord>(response: { data: { data?: unknown } }): T {
  const raw = response.data.data ?? response.data;
  return raw as T;
}

/**
 * Unwrap a list response from the backend.
 * The backend may return an array directly, or wrap it in a keyed object.
 */
export function unwrapList<T>(
  response: { data: { data?: unknown } },
  key?: string,
): T[] {
  const raw = response.data.data ?? response.data;
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (key && Array.isArray(obj[key])) return obj[key] as T[];
    for (const k of Object.keys(obj)) {
      if (Array.isArray(obj[k])) return obj[k] as T[];
    }
  }
  return [];
}

/** Extract an API error message from an axios-style error. */
export function extractErrorMessage(
  err: unknown,
  fallback = 'An error occurred',
): string {
  if (typeof err === 'object' && err !== null) {
    const axiosErr = err as {
      response?: { data?: { error?: string; message?: string } };
    };
    return (
      axiosErr.response?.data?.error ??
      axiosErr.response?.data?.message ??
      fallback
    );
  }
  return fallback;
}

/**
 * Resolve an ID from a field that may be a string, an object with `id`,
 * an object with `_id`, or undefined. Centralises the defensive casts
 * that previously polluted every teacher hook.
 *
 * @example
 *   resolveId(student.classId)      // string → '507f1f77bcf86cd799439011'
 *   resolveId(student.classId)      // { _id: '...' } → '...'
 *   resolveId(undefined)            // → ''
 */
export function resolveId(
  val: string | { id?: string; _id?: string } | null | undefined,
): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.id ?? val._id ?? '';
}

/** Narrow helper for extracting a named field from a populated sub-document. */
export function resolveField<T extends string | number | boolean>(
  val: unknown,
  key: string,
): T | undefined {
  if (typeof val !== 'object' || val === null) return undefined;
  const obj = val as Record<string, unknown>;
  const v = obj[key];
  return v === undefined ? undefined : (v as T);
}
