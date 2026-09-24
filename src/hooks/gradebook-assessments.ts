import apiClient from '@/lib/api-client';
import { resolveId, unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { resolveLinkedAssessment } from '@/lib/gradebook-link';
import type { Assessment } from '@/types';

/**
 * A class's assessments (optionally one subject's), plus which to open: the
 * linked one if given (fetched by id when it isn't on the first page), else
 * the most recent, so a fresh publish is immediately visible.
 */
export async function loadClassAssessments(
  classId: string,
  subjectId: string,
  wantedId: string | undefined,
): Promise<{ list: Assessment[]; chosen: string | null }> {
  const params: Record<string, string> = { classId };
  if (subjectId) params.subjectId = subjectId;
  let list = unwrapList<Assessment>(await apiClient.get('/academic/assessments', { params }));
  const { pick, fetchWanted } = resolveLinkedAssessment(list, wantedId);
  if (!fetchWanted || !wantedId) return { list, chosen: pick };

  try {
    const one = unwrapResponse<Assessment>(await apiClient.get(`/academic/assessments/${wantedId}`));
    if (resolveId(one.classId as string | { id?: string; _id?: string } | undefined) === classId) {
      list = [one, ...list.filter((a: Assessment) => a.id !== one.id)];
      return { list, chosen: one.id };
    }
  } catch (err: unknown) {
    console.error('Linked assessment not found', err);
  }
  return { list, chosen: list[0]?.id ?? null };
}
