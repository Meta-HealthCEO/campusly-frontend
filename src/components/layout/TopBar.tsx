'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/utils';
import { getRoleLabel, getRoleProfilePath, getRoleSettingsPath } from '@/lib/auth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { navContextFor } from '@/lib/nav-context';
import type { NavItem } from '@/lib/constants';

interface TopBarProps {
  /** Nav items to name the current page from; without them the bar shows the role. */
  items?: NavItem[];
}

/** Spec §3: the page's context, notifications and the account menu. The page's own PageHeader carries the h1. */
export function TopBar({ items }: TopBarProps = {}) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const context = items ? navContextFor(pathname, items) : null;
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const profilePath = user ? getRoleProfilePath(user.role) : null;
  const settingsPath = user ? getRoleSettingsPath(user.role) : null;
  const title = context?.label ?? (user ? getRoleLabel(user.role) : 'Dashboard');
  const eyebrow = context?.section && context.section !== context.label ? context.section : null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:h-16 md:px-6 lg:px-8">
      <div className="min-w-0">
        {eyebrow && <p className="hidden text-eyebrow font-semibold uppercase text-muted-foreground md:block">{eyebrow}</p>}
        <p className="truncate font-heading text-h3 font-semibold tracking-[-0.015em]">{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 px-1.5 md:px-2" aria-label="Account menu">
                <Avatar className="size-8">
                  <AvatarFallback>{user ? getInitials(user.firstName, user.lastName) : 'U'}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-semibold md:inline-block">{user ? `${user.firstName} ${user.lastName}` : 'User'}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            {profilePath && (
              <DropdownMenuItem onClick={() => router.push(profilePath)}>
                <User className="mr-2 size-4" aria-hidden="true" /> Profile
              </DropdownMenuItem>
            )}
            {settingsPath && (
              <DropdownMenuItem onClick={() => router.push(settingsPath)}>
                <Settings className="mr-2 size-4" aria-hidden="true" /> Settings
              </DropdownMenuItem>
            )}
            {(profilePath || settingsPath) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 size-4" aria-hidden="true" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
