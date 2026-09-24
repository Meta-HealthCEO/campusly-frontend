'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ModuleOffState } from '@/components/shared/ModuleOffState';
import { teacherModuleGate } from '@/lib/teacher-module-routes';

/** Teacher pages behind a per-school module wait for the school, then show an off state instead of 403s. */
export default function TeacherLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const modulesEnabled = useSchoolStore((s) => s.school?.modulesEnabled ?? null);
  const schoolError = useSchoolStore((s) => s.schoolError);
  const gate = teacherModuleGate({ pathname, modulesEnabled, schoolError });

  if (gate.kind === 'checking') return <LoadingSpinner />;
  if (gate.kind === 'off') return <ModuleOffState label={gate.label} />;
  return <>{children}</>;
}
