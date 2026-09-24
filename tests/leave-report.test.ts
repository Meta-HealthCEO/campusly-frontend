import { describe, expect, it } from 'vitest';
import { toLeaveReportSummary } from '../src/lib/leave-report';

describe('toLeaveReportSummary', () => {
  it("reads the totals and days by type from the API's summary", () => {
    const report = toLeaveReportSummary({
      year: 2026,
      overall: { totalRequests: 4, totalApproved: 2, totalDeclined: 1, totalPending: 1, totalDaysUsed: 5 },
      byType: [
        { _id: 'annual', totalRequests: 3, totalDays: 7, statuses: [{ status: 'approved', count: 2, totalDays: 5 }, { status: 'pending', count: 1, totalDays: 2 }] },
        { _id: 'sick', totalRequests: 1, totalDays: 1, statuses: [{ status: 'declined', count: 1, totalDays: 1 }] },
      ],
    });

    expect(report).toMatchObject({ totalRequests: 4, approved: 2, declined: 1, pending: 1 });
    expect(report.byLeaveType).toEqual([
      { type: 'annual', count: 3, totalDays: 5 },
      { type: 'sick', count: 1, totalDays: 0 },
    ]);
  });

  it('gives empty charts, not a crash, for a year with no leave', () => {
    const report = toLeaveReportSummary({ year: 2026, byType: [] });
    expect(report).toEqual({
      totalRequests: 0, approved: 0, declined: 0, pending: 0,
      byLeaveType: [], byDepartment: [], byMonth: [], topUsers: [],
    });
  });
});
