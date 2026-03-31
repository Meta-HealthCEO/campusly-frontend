'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Bell, CheckCheck } from 'lucide-react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { useNotifications } from '@/hooks/useNotifications';

type FilterTab = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const {
    notifications,
    isLoading,
    unreadCount,
    page,
    totalPages,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [filter, setFilter] = useState<FilterTab>('all');

  const loadNotifications = useCallback(
    (pageNum: number = 1) => {
      const params: { page: number; limit: number; isRead?: string } = {
        page: pageNum,
        limit: 20,
      };
      if (filter === 'unread') params.isRead = 'false';
      if (filter === 'read') params.isRead = 'true';
      fetchNotifications(params);
    },
    [filter, fetchNotifications]
  );

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      loadNotifications(page + 1);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="View and manage your notifications."
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={unreadCount === 0}
          onClick={handleMarkAllRead}
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </Button>
      </PageHeader>

      <Tabs
        defaultValue="all"
        onValueChange={(val) => setFilter(val as FilterTab)}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-2">
          {isLoading && notifications.length === 0 ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
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
            <>
              <NotificationList
                notifications={notifications}
                onMarkRead={handleMarkRead}
              />
              {page < totalPages && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description={
                filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : filter === 'read'
                    ? 'No read notifications yet.'
                    : 'No notifications yet. They will appear here when events occur.'
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
