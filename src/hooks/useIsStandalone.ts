import { useAuthStore } from '@/stores/useAuthStore';

export function useIsStandalone(): boolean {
  const user = useAuthStore((s) => s.user);
  return (user as unknown as { isStandaloneTeacher?: boolean })?.isStandaloneTeacher === true;
}
