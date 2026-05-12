import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse } from '@/lib/api-helpers';

export type ModuleKey =
  | 'academic' | 'communication' | 'library' | 'wallet' | 'tuck_shop'
  | 'achiever' | 'sports' | 'incident_wellbeing' | 'careers'
  | 'portfolio';

interface SchoolModulesPayload {
  modulesEnabled?: string[];
}

interface UseStudentModulesResult {
  phase: 'standalone' | 'school';
  enabled: Set<ModuleKey>;
  loading: boolean;
}

export function useStudentModules(): UseStudentModulesResult {
  const { user } = useAuthStore();
  const [enabled, setEnabled] = useState<Set<ModuleKey>>(new Set());
  const [phase, setPhase] = useState<'standalone' | 'school'>('standalone');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.schoolId) {
        if (!cancelled) {
          setPhase('standalone');
          setEnabled(new Set());
          setLoading(false);
        }
        return;
      }
      try {
        const response = await apiClient.get(`/schools/${user.schoolId}`);
        const school = unwrapResponse<SchoolModulesPayload>(response);
        const modules = (school.modulesEnabled ?? []) as ModuleKey[];
        if (!cancelled) {
          setEnabled(new Set(modules));
          setPhase(modules.length === 0 ? 'standalone' : 'school');
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPhase('standalone');
          setEnabled(new Set());
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.schoolId]);

  return { phase, enabled, loading };
}
