'use client';

import { mockSchool } from '@/lib/mock-data';

export function useModule() {
  const isModuleEnabled = (moduleId: string): boolean => {
    return mockSchool.enabledModules.includes(moduleId);
  };

  return { isModuleEnabled };
}
