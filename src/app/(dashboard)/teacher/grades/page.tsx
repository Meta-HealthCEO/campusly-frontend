'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Save, BookOpen } from 'lucide-react';
import {
  mockStudents,
  mockAssessments,
  mockClasses,
  mockStudentGrades,
} from '@/lib/mock-data';

export default function TeacherGradesPage() {
  const [selectedClass, setSelectedClass] = useState<string>('c1');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('a1');
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const classStudents = mockStudents.filter(
    (s) => s.classId === selectedClass
  );

  const currentAssessment = mockAssessments.find(
    (a) => a.id === selectedAssessment
  );

  // Filter assessments by selected class
  const classAssessments = mockAssessments.filter(
    (a) => a.classId === selectedClass
  );

  // Initialize grades from existing mock data
  const getGrade = (studentId: string): string => {
    if (grades[studentId] !== undefined) return grades[studentId];
    const existing = mockStudentGrades.find(
      (sg) =>
        sg.studentId === studentId &&
        sg.assessmentId === selectedAssessment
    );
    return existing ? String(existing.marks) : '';
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setGrades((prev) => ({ ...prev, [studentId]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gradebook"
        description="Enter and manage student assessment marks"
      />

      {/* Selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Class:</span>
              <Select
                value={selectedClass}
                onValueChange={(val) => {
                  setSelectedClass(val as string);
                  setGrades({});
                  setSaved(false);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {mockClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade.name} {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assessment:</span>
              <Select
                value={selectedAssessment}
                onValueChange={(val) => {
                  setSelectedAssessment(val as string);
                  setGrades({});
                  setSaved(false);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select assessment" />
                </SelectTrigger>
                <SelectContent>
                  {classAssessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id}>
                      {assessment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Info */}
      {currentAssessment && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{currentAssessment.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentAssessment.subject.name} &middot;{' '}
                {currentAssessment.type} &middot; Total:{' '}
                {currentAssessment.totalMarks} marks &middot; Weight:{' '}
                {currentAssessment.weight}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gradebook Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Student Marks ({classStudents.length} students)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No students found for this class.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground">
                      #
                    </th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground">
                      Student Name
                    </th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground">
                      Admission No.
                    </th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground w-32">
                      Marks (/{currentAssessment?.totalMarks || 100})
                    </th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground w-20">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, index) => {
                    const mark = getGrade(student.id);
                    const numericMark = Number(mark);
                    const percentage = mark && currentAssessment
                      ? Math.round(
                          (numericMark / currentAssessment.totalMarks) * 100
                        )
                      : null;

                    return (
                      <tr key={student.id} className="border-b last:border-0">
                        <td className="py-3 text-sm text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="py-3 text-sm font-medium">
                          {student.user.lastName}, {student.user.firstName}
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {student.admissionNumber}
                        </td>
                        <td className="py-3">
                          <Input
                            type="number"
                            min={0}
                            max={currentAssessment?.totalMarks || 100}
                            value={mark}
                            onChange={(e) =>
                              handleGradeChange(student.id, e.target.value)
                            }
                            placeholder="Enter marks"
                            className="w-28"
                          />
                        </td>
                        <td className="py-3">
                          {percentage !== null && !isNaN(percentage) ? (
                            <span
                              className={`text-sm font-semibold ${
                                percentage >= 80
                                  ? 'text-emerald-600'
                                  : percentage >= 50
                                  ? 'text-blue-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {percentage}%
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              --
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saved}>
              <Save className="mr-2 h-4 w-4" />
              {saved ? 'Saved' : 'Save Marks'}
            </Button>
          </div>
          {saved && (
            <p className="mt-2 text-sm text-emerald-600 text-right">
              Marks saved successfully!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
