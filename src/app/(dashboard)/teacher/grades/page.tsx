'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Save, BookOpen } from 'lucide-react';
import { useTeacherGrades } from '@/hooks/useTeacherGrades';
import type { Assessment } from '@/types';

function getSubjectName(a: Assessment): string {
  if (a.subject?.name) return a.subject.name;
  if (typeof a.subjectId === 'object' && a.subjectId !== null) {
    return ((a.subjectId as Record<string, unknown>).name as string) ?? '';
  }
  return '';
}

export default function TeacherGradesPage() {
  const {
    classes, assessments, markEntries,
    selectedClass, selectedAssessment,
    loading, saving, currentAssessment,
    setSelectedClass, setSelectedAssessment,
    handleMarkChange, saveMarks,
  } = useTeacherGrades();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Gradebook" description="Enter and manage student assessment marks" />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Class:</span>
              <Select value={selectedClass} onValueChange={(val: unknown) => setSelectedClass(val as string)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade?.name ?? (cls as unknown as Record<string, unknown>).gradeName ?? ''} {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assessment:</span>
              <Select value={selectedAssessment} onValueChange={(val: unknown) => setSelectedAssessment(val as string)}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Select assessment" /></SelectTrigger>
                <SelectContent>
                  {assessments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentAssessment && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{currentAssessment.name}</p>
              <p className="text-sm text-muted-foreground">
                {getSubjectName(currentAssessment)} &middot; {currentAssessment.type} &middot; Total: {currentAssessment.totalMarks} marks &middot; Weight: {currentAssessment.weight}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Student Marks ({markEntries.length} students)</CardTitle>
        </CardHeader>
        <CardContent>
          {markEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {selectedAssessment ? 'No students found for this class.' : 'Select a class and assessment to begin.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground">#</th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground">Student Name</th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground">Admission No.</th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground w-32">Marks (/{currentAssessment?.totalMarks ?? 100})</th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground w-20">%</th>
                  </tr>
                </thead>
                <tbody>
                  {markEntries.map((entry, index) => {
                    const numericMark = Number(entry.mark);
                    const percentage = entry.mark && currentAssessment
                      ? Math.round((numericMark / currentAssessment.totalMarks) * 100)
                      : null;
                    return (
                      <tr key={entry.studentId} className="border-b last:border-0">
                        <td className="py-3 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="py-3 text-sm font-medium">{entry.lastName}, {entry.firstName}</td>
                        <td className="py-3 text-sm text-muted-foreground">{entry.admissionNumber}</td>
                        <td className="py-3">
                          <Input
                            type="number" min={0} max={currentAssessment?.totalMarks ?? 100}
                            value={entry.mark}
                            onChange={(e) => handleMarkChange(entry.studentId, e.target.value)}
                            placeholder="Enter marks" className="w-28"
                          />
                        </td>
                        <td className="py-3">
                          {percentage !== null && !isNaN(percentage) ? (
                            <span className={`text-sm font-semibold ${percentage >= 80 ? 'text-emerald-600' : percentage >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                              {percentage}%
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {markEntries.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button onClick={saveMarks} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Marks'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
