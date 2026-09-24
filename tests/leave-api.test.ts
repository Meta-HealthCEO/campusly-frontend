import { beforeEach, describe, expect, it, vi } from 'vitest';

// Run the hooks outside React: state setters are no-ops, callbacks are the functions themselves.
vi.mock('react', () => ({
  useState: (init: unknown) => [typeof init === 'function' ? (init as () => unknown)() : init, () => undefined],
  useCallback: (fn: unknown) => fn,
}));

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
vi.mock('@/lib/api-client', () => ({ default: { get, post, put } }));

const { useLeave } = await import('../src/hooks/useLeave');
const { useLeaveAdmin } = await import('../src/hooks/useLeaveAdmin');

const ok = { data: { data: { requests: [], total: 0 } } };

/** Every request the hooks made, as [path, query-or-body]. */
function sent(): unknown[] {
  return [...get.mock.calls, ...post.mock.calls, ...put.mock.calls].map((c) => c[1]);
}

describe('leave API calls', () => {
  beforeEach(() => {
    for (const fn of [get, post, put]) fn.mockReset().mockResolvedValue(ok);
  });

  it('never sends schoolId — the API takes the school from the sign-in token', async () => {
    const leave = useLeave();
    const admin = useLeaveAdmin();

    await leave.fetchRequests({ status: 'pending' });
    await leave.fetchBalances({ year: 2026 });
    await leave.fetchCalendar('2026-09-01', '2026-09-30');
    await leave.fetchSubstitutes({ startDate: '2026-09-01', endDate: '2026-09-02' });
    await leave.createRequest({
      leaveType: 'sick', startDate: '2026-09-01', endDate: '2026-09-01', reason: 'Flu',
      isHalfDay: false, halfDayPeriod: null, documentUrl: null, substituteTeacherId: null,
    });
    await leave.initializeBalances({ year: 2026 });
    await admin.fetchPolicy();
    await admin.updatePolicy({ leaveTypes: [] });
    await admin.fetchReport({ year: 2026 });

    expect(sent()).toHaveLength(9);
    for (const payload of sent()) {
      const values = (payload as { params?: object } | undefined)?.params ?? payload ?? {};
      expect(Object.keys(values)).not.toContain('schoolId');
    }
  });

  it('asks for the leave list with only the filters the page chose', async () => {
    await useLeave().fetchRequests({ status: 'approved' });
    expect(get).toHaveBeenCalledWith('/leave/requests', { params: { status: 'approved' } });
  });
});
