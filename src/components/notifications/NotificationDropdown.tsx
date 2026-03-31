'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Bell } from 'lucide-react';
import { NotificationList } from './NotificationList';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const {
    notifications,
    isLoading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications({ limit: 10 });
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
  };

  return (
    <div className="flex flex-col max-h-[420px]">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          disabled={unreadCount === 0}
          onClick={handleMarkAllRead}
        >
          Mark all as read
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1">
        {isLoading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <NotificationList
            notifications={notifications.slice(0, 10)}
            onMarkRead={handleMarkRead}
          />
        ) : (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up!"
          />
        )}
      </div>

      <div className="border-t px-3 py-2">
        <Link
          href="/notifications"
          className="block text-center text-xs text-primary hover:underline"
          onClick={onClose}
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
