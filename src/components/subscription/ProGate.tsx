'use client';

import type { ReactNode } from 'react';
import { useEntitlement } from '@/hooks/useEntitlement';

interface Props {
  feature: string;
  fallback: ReactNode;
  children: ReactNode;
}

export function ProGate({ feature, fallback, children }: Props) {
  const entitled = useEntitlement(feature);
  return <>{entitled ? children : fallback}</>;
}
