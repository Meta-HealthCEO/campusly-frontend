'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Users, Save, Calendar } from 'lucide-react';
import { useTeacherAttendance } from '@/hooks/useTeacherAttendance';

const periods = ['1', '2', '3', '4', '5', '6'];

export default function TeacherAttendancePage() {
  const {
    classes,
    selectedClass,
    selectedPeriod,
    classStudents,
    currentAttendance,
    saved,
    saving,
    updateStatus,
    changeClass,
    changePeriod,
    saveAttendance,
  } = useTeacherAttendance();

  const presentCount = currentAttendance.filter((a) => a.status === 'present').length;
  const absentCount = currentAttendance.filter((a) => a.status === 'absent').length;
  const lateCount = currentAttendance.filter((a) => a.status === 'late').length;
  const excusedCount = currentAttendance.filter((a) => a.status === 'excused').length;

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
              <Select
                value={selectedClass}
                onValueChange={(val) => changeClass(val as string)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade?.name ?? cls.gradeName ?? ''} {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Period:</span>
              <Select
                value={selectedPeriod}
                onValueChange={(val) => changePeriod(val as string)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>Period {p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{absentCount}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{excusedCount}</p>
            <p className="text-xs text-muted-foreground">Excused</p>
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
            <p className="text-sm text-muted-foreground py-8 text-center">
              No students found for this class.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                <span>Student</span>
                <span className="w-16 text-center">Present</span>
                <span className="w-16 text-center">Absent</span>
                <span className="w-16 text-center">Late</span>
                <span className="w-16 text-center">Excused</span>
              </div>
              {classStudents.map((student) => {
                const sid = student.id;
                const studentStatus = currentAttendance.find((a) => a.studentId === sid)?.status || 'present';
                return (
                  <div
                    key={sid}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center rounded-lg border px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {student.user?.firstName ?? (typeof student.userId === 'object' && student.userId !== null ? (student.userId as unknown as { firstName?: string }).firstName : undefined) ?? student.firstName}{' '}
                        {student.user?.lastName ?? (typeof student.userId === 'object' && student.userId !== null ? (student.userId as unknown as { lastName?: string }).lastName : undefined) ?? student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
                    </div>
                    <div className="w-16 flex justify-center">
                      <Checkbox
                        checked={studentStatus === 'present'}
                        onCheckedChange={() => updateStatus(sid, 'present')}
                      />
                    </div>
                    <div className="w-16 flex justify-center">
                      <Checkbox
                        checked={studentStatus === 'absent'}
                        onCheckedChange={() => updateStatus(sid, 'absent')}
                      />
                    </div>
                    <div className="w-16 flex justify-center">
                      <Checkbox
                        checked={studentStatus === 'late'}
                        onCheckedChange={() => updateStatus(sid, 'late')}
                      />
                    </div>
                    <div className="w-16 flex justify-center">
                      <Checkbox
                        checked={studentStatus === 'excused'}
                        onCheckedChange={() => updateStatus(sid, 'excused')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={saveAttendance} disabled={saved || saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : saved ? 'Saved' : 'Submit Attendance'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
