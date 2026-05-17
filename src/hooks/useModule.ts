'use client';

import { useSchoolStore } from '@/stores/useSchoolStore';

const MODULE_ALIASES: Record<string, string> = {
  fees: 'fee',
  sports: 'sport',
  events: 'event',
  tuck_shop: 'tuckshop',
};

function normalizeModuleName(moduleName: string): string {
  return MODULE_ALIASES[moduleName] ?? moduleName;
}

export function useModule() {
  const school = useSchoolStore((s) => s.school);

  const isModuleEnabled = (moduleId: string): boolean => {
    if (!school) return true; // Allow all modules while school is loading
    const normalizedModuleId = normalizeModuleName(moduleId);
    return school.modulesEnabled.some(
      (enabledModule) => normalizeModuleName(enabledModule) === normalizedModuleId,
    );
  };

  return { isModuleEnabled };
}
