'use client';

import { formatRelativeDate } from '@/lib/utils';
import type { AppNotification } from '@/types/notifications';

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }
    if (notification.data && typeof notification.data === 'object') {
      const link = notification.data.link;
      if (typeof link === 'string' && link.startsWith('/')) {
        window.location.href = link;
      }
    }
  };

  return (
    <li
      className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
        !notification.isRead ? 'bg-primary/5' : ''
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="mt-1.5 shrink-0">
        {!notification.isRead ? (
          <span className="block h-2 w-2 rounded-full bg-orange-500" />
        ) : (
          <span className="block h-2 w-2 rounded-full bg-transparent" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${!notification.isRead ? 'font-medium' : 'font-normal'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        {notification.createdAt && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {formatRelativeDate(notification.createdAt)}
          </p>
        )}
      </div>
    </li>
  );
}
