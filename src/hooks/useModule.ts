'use client';

import { useSchoolStore } from '@/stores/useSchoolStore';

export function useModule() {
  const school = useSchoolStore((s) => s.school);

  const isModuleEnabled = (moduleId: string): boolean => {
    if (!school) return true; // Allow all modules while school is loading
    return school.modulesEnabled.includes(moduleId);
  };

  return { isModuleEnabled };
}
