import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/lib/api-client', () => ({ default: { get, post } }));
vi.mock('@/lib/token-refresh', () => ({ scheduleTokenRefresh: vi.fn(), cancelTokenRefresh: vi.fn() }));

const { useAuthStore } = await import('../src/stores/useAuthStore');

const learner = { _id: 'u1', email: 'thabo@example.test', firstName: 'Thabo', lastName: 'M', role: 'student', schoolId: 's1' };

describe('signUpStudent (spec §1)', () => {
  beforeEach(() => { get.mockReset(); post.mockReset(); useAuthStore.getState().logout(); });

  it('signs the learner in and has the standalone flag before the first page', async () => {
    post.mockResolvedValue({ data: { data: { user: learner, accessToken: 'a' } } });
    get.mockResolvedValue({ data: { data: { user: { ...learner, isStandaloneLearner: true }, subscription: null, plan: null } } });

    const user = await useAuthStore.getState().signUpStudent({ firstName: 'Thabo', lastName: 'M', email: 'thabo@example.test', password: 'Learner1-check', classroomCode: 'AB12CD' });

    expect(post).toHaveBeenCalledWith('/auth/register-student', expect.objectContaining({ classroomCode: 'AB12CD' }));
    expect(get).toHaveBeenCalledWith('/auth/me');
    expect(user.role).toBe('student');
    expect(useAuthStore.getState().user?.isStandaloneLearner).toBe(true);
  });
});
