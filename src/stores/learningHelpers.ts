// Shared helpers for useLearningStore

export function unwrapList<T>(data: unknown): T[] {
  const raw = (data as Record<string, unknown>)?.data ?? data;
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
    const inner = (raw as Record<string, unknown>).data;
    return Array.isArray(inner) ? inner as T[] : [];
  }
  return [];
}

export function mapId<T extends { _id?: string; id?: string }>(item: T): T & { id: string } {
  return { ...item, id: (item._id ?? item.id ?? '') };
}

export function extractTotal(raw: unknown, fallback: number): number {
  if (typeof raw === 'object' && raw !== null && 'total' in (raw as Record<string, unknown>)) {
    return Number((raw as Record<string, unknown>).total);
  }
  return fallback;
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  const resp = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return resp ?? fallback;
}
