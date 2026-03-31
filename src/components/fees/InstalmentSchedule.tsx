'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Instalment {
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
}

interface InstalmentScheduleProps {
  instalments: Instalment[];
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  partial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export function InstalmentSchedule({ instalments, onClose }: InstalmentScheduleProps) {
  if (!instalments.length) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Instalment Schedule</CardTitle>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Close
        </button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium">#</th>
                <th className="pb-2 pr-4 font-medium">Due Date</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium">Paid</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {instalments.map((inst, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 pr-4">{idx + 1}</td>
                  <td className="py-2 pr-4">{inst.dueDate ? formatDate(inst.dueDate) : '—'}</td>
                  <td className="py-2 pr-4">{formatCurrency(inst.amount)}</td>
                  <td className="py-2 pr-4">{formatCurrency(inst.paidAmount)}</td>
                  <td className="py-2">
                    <Badge className={statusStyles[inst.status] ?? ''}>
                      {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
