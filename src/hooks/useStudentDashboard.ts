import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import type { Homework, HomeworkSubmission, Wallet, TimetableSlot } from '@/types';

interface StudentDashboardResult {
  homework: Homework[];
  submissions: HomeworkSubmission[];
  wallet: Wallet | null;
  timetable: TimetableSlot[];
  loading: boolean;
}

export function useStudentDashboard(): StudentDashboardResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;

    const currentStudent = student;
    async function fetchDashboardData() {
      const sid = currentStudent._id ?? currentStudent.id;
      const classId = currentStudent.class?.id ?? currentStudent.classId ?? '';

      const results = await Promise.allSettled([
        apiClient.get('/homework'),
        apiClient.get(`/homework/student/${sid}/submissions`),
        apiClient.get(`/wallets/student/${sid}`),
        classId ? apiClient.get(`/academic/timetable/class/${classId}`) : Promise.resolve(null),
      ]);

      if (results[0].status === 'fulfilled') {
        const arr = unwrapList<Homework>(results[0].value, 'homework');
        setHomework(arr.filter((h) => h.status === 'published'));
      }
      if (results[1].status === 'fulfilled') {
        setSubmissions(unwrapList<HomeworkSubmission>(results[1].value, 'submissions'));
      }
      if (results[2].status === 'fulfilled' && results[2].value) {
        const raw = unwrapResponse(results[2].value);
        setWallet(raw as unknown as Wallet);
      }
      if (results[3].status === 'fulfilled' && results[3].value) {
        setTimetable(unwrapList<TimetableSlot>(results[3].value, 'timetable'));
      }

      setLoading(false);
    }

    fetchDashboardData();
  }, [student]);

  return { homework, submissions, wallet, timetable, loading: studentLoading || loading };
}
