import { useAuthStore } from '@/stores/useAuthStore';

/** Whether the signed-in user is a standalone teacher's learner (server-computed flag, spec §1). */
export function useIsStandaloneLearner(): boolean {
  return useAuthStore((s) => s.user?.isStandaloneLearner === true);
}
