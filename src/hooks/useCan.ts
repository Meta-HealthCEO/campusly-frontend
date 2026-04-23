import { useAuthStore } from '@/stores/useAuthStore';
import { can, type Capability } from '@/lib/permissions';

export function useCan(cap: Capability): boolean {
  const user = useAuthStore((s) => s.user);
  return can(user, cap);
}
