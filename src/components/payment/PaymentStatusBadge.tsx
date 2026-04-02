import { Badge } from '@/components/ui/badge';
import type { OnlinePaymentStatus } from '@/types';

const statusConfig: Record<OnlinePaymentStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive' },
  initiated: { label: 'Initiated', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
  refunded: { label: 'Refunded', className: 'bg-blue-100 text-blue-800' },
};

interface PaymentStatusBadgeProps {
  status: OnlinePaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: '' };
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
