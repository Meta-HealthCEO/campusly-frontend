import { useAuthStore } from '@/stores/useAuthStore';

export function useIsStandalone(): boolean {
  const user = useAuthStore((s) => s.user);
  return user?.isStandaloneTeacher === true;
}
