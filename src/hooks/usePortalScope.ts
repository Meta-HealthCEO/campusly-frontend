'use client';

import { useEffect } from 'react';
import type { Portal } from '@/lib/portal-scope';

/**
 * Mirror the portal scope onto <body>. Dialogs, popovers, selects and toasts
 * portal outside the dashboard frame, so they need the tokens and fonts too.
 */
export function usePortalScope(portal: Portal | null, fontClasses: string): void {
  useEffect(() => {
    if (!portal) return;
    const body = document.body;
    const classes = fontClasses.split(' ').filter(Boolean);
    body.dataset.portal = portal;
    body.classList.add(...classes);
    return () => {
      delete body.dataset.portal;
      body.classList.remove(...classes);
    };
  }, [portal, fontClasses]);
}
