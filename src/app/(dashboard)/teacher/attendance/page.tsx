'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Users, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student, SchoolClass } from '@/types';
import apiClient from '@/lib/api-client';

type AttendanceStatus = 'present' | 'absent' | 'late';

interface StudentAttendance {
  studentId: string;
  status: AttendanceStatus;
}

const periods = ['1', '2', '3', '4', '5', '6'];

export default function TeacherAttendancePage() {
  const { user } = useAuthStore();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1');
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [saved, setSaved] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [studentsRes, classesRes] = await Promise.allSettled([
          apiClient.get('/students'),
          apiClient.get('/academic/classes'),
        ]);
        if (studentsRes.status === 'fulfilled' && studentsRes.value.data) {
          const d = studentsRes.value.data.data ?? studentsRes.value.data;
          const arr = Array.isArray(d) ? d : d.data ?? [];
          if (arr.length > 0) setStudents(arr);
        }
        if (classesRes.status === 'fulfilled' && classesRes.value.data) {
          const d = classesRes.value.data.data ?? classesRes.value.data;
          const arr = Array.isArray(d) ? d : d.data ?? [];
          if (arr.length > 0) {
            setClasses(arr);
            setSelectedClass(arr[0]?.id ?? '');
          }
        }
      } catch {
        console.error('Failed to load attendance data');
      }
    }
    fetchData();
  }, []);

  const classStudents = students.filter((s) => s.classId === selectedClass);

  const currentAttendance = classStudents.map((student) => {
    const existing = attendance.find((a) => a.studentId === student.id);
    return {
      studentId: student.id,
      status: existing?.status || ('present' as AttendanceStatus),
    };
  });

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.studentId !== studentId);
      return [...filtered, { studentId, status }];
    });
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await apiClient.post('/attendance/bulk', {
        classId: selectedClass,
        date: new Date().toISOString().split('T')[0],
        period: parseInt(selectedPeriod),
        records: currentAttendance.map((a) => ({ studentId: a.studentId, status: a.status })),
      });
      setSaved(true);
    } catch {
      toast.error('Failed to save attendance');
    }
  };

  const presentCount = currentAttendance.filter((a) => a.status === 'present').length;
  const absentCount = currentAttendance.filter((a) => a.status === 'absent').length;
  const lateCount = currentAttendance.filter((a) => a.status === 'late').length;

  const today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Take Attendance" description="Record student attendance for each period" />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{today}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Class:</span>
              <Select value={selectedClass} onValueChange={(val) => { setSelectedClass(val as string); setSaved(false); }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade?.name ?? (cls as any).gradeName ?? ''} {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Period:</span>
              <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val as string); setSaved(false); }}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Period" /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (<SelectItem key={p} value={p}>Period {p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students ({classStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No students found for this class.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                <span>Student</span>
                <span className="w-20 text-center">Present</span>
                <span className="w-20 text-center">Absent</span>
                <span className="w-20 text-center">Late</span>
              </div>
              {classStudents.map((student) => {
                const studentStatus = currentAttendance.find((a) => a.studentId === student.id)?.status || 'present';
                return (
                  <div key={student.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center rounded-lg border px-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{student.user?.firstName ?? student.firstName} {student.user?.lastName ?? student.lastName}</p>
                      <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
                    </div>
                    <div className="w-20 flex justify-center">
                      <Checkbox checked={studentStatus === 'present'} onCheckedChange={() => updateStatus(student.id, 'present')} />
                    </div>
                    <div className="w-20 flex justify-center">
                      <Checkbox checked={studentStatus === 'absent'} onCheckedChange={() => updateStatus(student.id, 'absent')} />
                    </div>
                    <div className="w-20 flex justify-center">
                      <Checkbox checked={studentStatus === 'late'} onCheckedChange={() => updateStatus(student.id, 'late')} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saved}>
              <Save className="mr-2 h-4 w-4" />
              {saved ? 'Saved' : 'Submit Attendance'}
            </Button>
          </div>
          {saved && <p className="mt-2 text-sm text-emerald-600 text-right">Attendance saved successfully!</p>}
        </CardContent>
      </Card>
    </div>
  );
}
