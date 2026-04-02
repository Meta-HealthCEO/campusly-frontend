import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useSchoolData } from './useSchoolData';

export function useSchool() {
  const user = useAuthStore((s) => s.user);
  const school = useSchoolStore((s) => s.school);
  const schoolLoading = useSchoolStore((s) => s.schoolLoading);
  const schoolError = useSchoolStore((s) => s.schoolError);
  const { fetchSchool } = useSchoolData();

  useEffect(() => {
    if (user?.schoolId && !school && !schoolLoading) {
      fetchSchool(user.schoolId);
    }
  }, [user?.schoolId, school, schoolLoading, fetchSchool]);

  return { school, schoolLoading, schoolError };
}
