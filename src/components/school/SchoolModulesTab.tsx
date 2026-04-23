'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ModuleToggleList } from './ModuleToggleList';
import { useSchoolData } from '@/hooks/useSchoolData';
import { useCan } from '@/hooks/useCan';
import type { SchoolDocument } from '@/types';

interface SchoolModulesTabProps {
  school: SchoolDocument;
}

export function SchoolModulesTab({ school }: SchoolModulesTabProps) {
  const [toggling, setToggling] = useState(false);
  const [optimisticModules, setOptimisticModules] = useState<string[]>(
    school.modulesEnabled,
  );
  const { updateSchool } = useSchoolData();
  const canManage = useCan('manage_school_settings');

  const handleToggle = async (moduleId: string, enabled: boolean) => {
    const newModules = enabled
      ? [...optimisticModules, moduleId]
      : optimisticModules.filter((id) => id !== moduleId);

    setOptimisticModules(newModules);
    setToggling(true);
    try {
      await updateSchool(school.id, {
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
      disabled={!canManage || toggling}
    />
  );
}
