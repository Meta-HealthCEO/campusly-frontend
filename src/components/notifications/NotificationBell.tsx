'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotificationStore } from '@/stores/useNotificationStore';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" />
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-orange-500">
            {displayCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-96 p-0">
        <NotificationDropdown
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
