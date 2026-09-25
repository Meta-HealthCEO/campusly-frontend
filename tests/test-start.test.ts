import { describe, expect, it, vi } from 'vitest';
import { startOrResume } from '../src/lib/test-start';

const conflict = { response: { status: 409, data: { error: 'Duplicate' } } };

describe('startOrResume (opening a test)', () => {
  it('resumes the submission a racing start just made, instead of saying the test is not available', async () => {
    const start = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValueOnce({ submissionId: 's1' });
    await expect(startOrResume(start)).resolves.toEqual({ submissionId: 's1' });
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('starts once when nothing races it', async () => {
    const start = vi.fn().mockResolvedValue({ submissionId: 's1' });
    await expect(startOrResume(start)).resolves.toEqual({ submissionId: 's1' });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('passes on every other refusal (already submitted, not assigned)', async () => {
    const refused = { response: { status: 400, data: { error: 'You have already submitted this paper.' } } };
    const start = vi.fn().mockRejectedValue(refused);
    await expect(startOrResume(start)).rejects.toBe(refused);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
