import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';

export function useSchool() {
  const user = useAuthStore((s) => s.user);
  const { school, schoolLoading, schoolError, fetchSchool } = useSchoolStore();

  useEffect(() => {
    if (user?.schoolId && !school && !schoolLoading) {
      fetchSchool(user.schoolId);
    }
  }, [user?.schoolId, school, schoolLoading, fetchSchool]);

  return { school, schoolLoading, schoolError };
}
