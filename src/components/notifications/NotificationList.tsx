'use client';

import { NotificationItem } from './NotificationItem';
import type { AppNotification } from '@/types/notifications';

interface NotificationListProps {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
}

export function NotificationList({ notifications, onMarkRead }: NotificationListProps) {
  return (
    <ul className="space-y-0.5">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
        />
      ))}
    </ul>
  );
}
