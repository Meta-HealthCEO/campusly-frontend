import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/api-client', () => ({ default: { get, post: vi.fn() } }));
vi.mock('@/lib/token-refresh', () => ({ scheduleTokenRefresh: vi.fn(), cancelTokenRefresh: vi.fn() }));

const { useAuthStore } = await import('../src/stores/useAuthStore');

const teacher = {
  id: 't1', email: 'new@teacher.test', firstName: 'New', lastName: 'Teacher', role: 'teacher' as const,
  phone: '', schoolId: 's1', isActive: true, isStandaloneTeacher: true, createdAt: '', updatedAt: '',
};
const plan = { id: 'p1', key: 'free', name: 'Free' };
const subscription = { id: 'sub1', status: 'active' };

describe('refreshAccount', () => {
  beforeEach(() => {
    get.mockReset();
    useAuthStore.getState().logout();
  });

  it('gives a teacher who just signed up their plan without a page reload', async () => {
    useAuthStore.getState().login(teacher, { accessToken: 'a', refreshToken: 'r' });
    get.mockResolvedValue({ data: { data: { user: teacher, subscription, plan } } });

    await useAuthStore.getState().refreshAccount();

    expect(get).toHaveBeenCalledWith('/auth/me');
    const state = useAuthStore.getState();
    expect(state.subscription).toEqual(subscription);
    expect(state.plan).toEqual(plan);
    expect(state.user?.email).toBe('new@teacher.test');
  });

  it("keeps the teacher signed in when the account details can't be fetched", async () => {
    useAuthStore.getState().login(teacher, { accessToken: 'a', refreshToken: 'r' });
    get.mockRejectedValue(new Error('network down'));

    await expect(useAuthStore.getState().refreshAccount()).resolves.toBeUndefined();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.subscription).toBeNull();
  });
});

describe('refreshAccount and email verification', () => {
  beforeEach(() => {
    get.mockReset();
    useAuthStore.getState().logout();
  });

  it('picks up a newly verified email without a page reload', async () => {
    useAuthStore.getState().login({ ...teacher, emailVerifiedAt: null }, { accessToken: 'a', refreshToken: 'r' });
    get.mockResolvedValue({ data: { data: { user: { ...teacher, emailVerifiedAt: '2026-09-25T08:00:00.000Z' }, subscription, plan } } });

    await useAuthStore.getState().refreshAccount();

    expect(useAuthStore.getState().user?.emailVerifiedAt).toBe('2026-09-25T08:00:00.000Z');
    expect(useAuthStore.getState().permissions.isStandaloneTeacher).toBe(true);
  });
});
