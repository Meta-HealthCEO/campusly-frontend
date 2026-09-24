import type { LeaveReportSummary } from '@/types';

/** What GET /leave/reports/summary returns. */
export interface LeaveReportResponse {
  year: number;
  overall?: {
    totalRequests: number;
    totalApproved: number;
    totalDeclined: number;
    totalPending: number;
    totalDaysUsed: number;
  };
  byType?: Array<{
    _id: string;
    totalRequests: number;
    totalDays: number;
    statuses: Array<{ status: string; count: number; totalDays: number }>;
  }>;
}

/**
 * Shapes the API's summary for the report charts. Days by type count approved
 * leave only (days actually taken). The API has no department or monthly
 * breakdown, so those charts show their empty state.
 */
export function toLeaveReportSummary(raw: LeaveReportResponse): LeaveReportSummary {
  const overall = raw.overall;
  return {
    totalRequests: overall?.totalRequests ?? 0,
    approved: overall?.totalApproved ?? 0,
    declined: overall?.totalDeclined ?? 0,
    pending: overall?.totalPending ?? 0,
    byLeaveType: (raw.byType ?? []).map((row) => ({
      type: row._id,
      count: row.totalRequests,
      totalDays: row.statuses.find((s) => s.status === 'approved')?.totalDays ?? 0,
    })),
    byDepartment: [],
    byMonth: [],
    topUsers: [],
  };
}
