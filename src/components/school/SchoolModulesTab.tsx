'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ModuleToggleList } from './ModuleToggleList';
import { useSchoolStore } from '@/stores/useSchoolStore';
import type { SchoolDocument } from '@/types';

interface SchoolModulesTabProps {
  school: SchoolDocument;
}

export function SchoolModulesTab({ school }: SchoolModulesTabProps) {
  const [toggling, setToggling] = useState(false);
  const [optimisticModules, setOptimisticModules] = useState<string[]>(
    school.modulesEnabled,
  );

  const handleToggle = async (moduleId: string, enabled: boolean) => {
    const newModules = enabled
      ? [...optimisticModules, moduleId]
      : optimisticModules.filter((id) => id !== moduleId);

    setOptimisticModules(newModules);
    setToggling(true);
    try {
      await useSchoolStore.getState().updateSchool(school.id, {
        modulesEnabled: newModules,
      });
      toast.success(`Module ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      setOptimisticModules(optimisticModules);
      toast.error('Failed to update module');
    } finally {
      setToggling(false);
    }
  };

  return (
    <ModuleToggleList
      enabledModules={optimisticModules}
      onToggle={handleToggle}
      disabled={toggling}
    />
  );
}
