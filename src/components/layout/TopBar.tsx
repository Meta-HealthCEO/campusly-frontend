'use client';

import { Menu, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUIStore } from '@/stores/useUIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/utils';
import { getRoleLabel } from '@/lib/auth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function TopBar() {
  const { toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar} aria-label="Toggle menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:block">
          <h2 className="text-sm font-medium text-muted-foreground">
            {user ? getRoleLabel(user.role) : 'Dashboard'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user ? getInitials(user.firstName, user.lastName) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline-block">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem><User className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
