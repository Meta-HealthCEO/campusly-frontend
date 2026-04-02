import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId } from '@/lib/api-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import type { Achievement, StudentAchievement, House } from '@/types';

interface StudentAchievementsResult {
  achievements: Achievement[];
  earned: StudentAchievement[];
  houses: House[];
  loading: boolean;
}

export function useStudentAchievements(): StudentAchievementsResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<StudentAchievement[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) {
      if (!studentLoading) setLoading(false);
      return;
    }

    const currentStudent = student;
    async function fetchData() {
      const sid = currentStudent._id ?? currentStudent.id;
      const results = await Promise.allSettled([
        apiClient.get('/achiever/achievements'),
        apiClient.get('/achiever/houses'),
      ]);

      if (results[0].status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(results[0].value, 'achievements');
        const mapped = arr.map(mapId);
        setAchievements(mapped as unknown as Achievement[]);

        // Filter student achievements
        const studentOnes = mapped.filter(
          (a) => (a as unknown as { studentId?: string }).studentId === sid
        );
        setEarned(studentOnes as unknown as StudentAchievement[]);
      }

      if (results[1].status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(results[1].value, 'houses');
        setHouses(arr.map(mapId) as unknown as House[]);
      }

      setLoading(false);
    }

    fetchData();
  }, [student, studentLoading]);

  return { achievements, earned, houses, loading: studentLoading || loading };
}
