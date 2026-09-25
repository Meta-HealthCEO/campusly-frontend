function statusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined;
  const response = (err as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

/**
 * Starts (or resumes) a learner's test submission. A second start racing the first (React's development
 * double effect, a double tap) is refused with 409 by the server's one-submission-per-learner index; asking
 * again then resumes the submission the first start made.
 */
export async function startOrResume<T>(start: () => Promise<T>): Promise<T> {
  try {
    return await start();
  } catch (err: unknown) {
    if (statusOf(err) !== 409) throw err;
    return start();
  }
}
