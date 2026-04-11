'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCardsSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Save, BookOpen, Download, FileText, AlertCircle } from 'lucide-react';
import { useTeacherGrades } from '@/hooks/useTeacherGrades';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
// Assessment creation now goes through Curriculum → Assessments → Paper Builder
import { EditAssessmentDialog } from '@/components/grades/EditAssessmentDialog';
import { StudentHistoryDialog } from '@/components/grades/StudentHistoryDialog';
import { ClassStatsBar } from '@/components/grades/ClassStatsBar';
import { AssessmentInfoCard } from '@/components/grades/AssessmentInfoCard';
import type { Assessment } from '@/types';

function getSubjectName(a: Assessment): string {
  if (a.subject?.name) return a.subject.name;
  if (typeof a.subjectId === 'object' && a.subjectId !== null) {
    return ((a.subjectId as Record<string, unknown>).name as string) ?? '';
  }
  return '';
}

function getPaperId(a: Assessment): string | null {
  if (!a.paperId) return null;
  if (typeof a.paperId === 'string') return a.paperId;
  return a.paperId.id;
}

const TERM_OPTIONS = [
  { value: 'all', label: 'All terms' },
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
  { value: '4', label: 'Term 4' },
];

export default function TeacherGradesPage() {
  const {
    classes, subjects, assessments, markEntries,
    selectedClass, selectedSubject, selectedAssessment, selectedTerm,
    loading, saving, isDirty, currentAssessment, classStats,
    hasValidationErrors, getMarkError,
    studentHistory, selectedStudent,
    setSelectedClass, setSelectedSubject, setSelectedAssessment, setSelectedTerm,
    setSelectedStudent, handleMarkChange, saveMarks,
    updateAssessment, deleteAssessment, fetchStudentHistory,
  } = useTeacherGrades();

  const [editOpen, setEditOpen] = useState(false);

  // Warn the user before closing/reloading the tab if marks are unsaved.
  useUnsavedChanges(isDirty, 'You have unsaved marks. Are you sure you want to leave?');

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gradebook" description="Enter and manage student assessment marks" />
        <StatCardsSkeleton count={4} />
        <TableSkeleton rows={8} columns={5} />
      </div>
    );
  }

  const selectedClassName = classes.find((c) => c.id === selectedClass);
  const classDisplayName = selectedClassName
    ? `${selectedClassName.grade?.name ?? (selectedClassName as unknown as Record<string, unknown>).gradeName ?? ''} ${selectedClassName.name}`
    : 'Select class';

  const selectedSubjectName = subjects.find((s) => s.id === selectedSubject)?.name ?? 'All subjects';
  const selectedAssessmentName = assessments.find((a) => a.id === selectedAssessment)?.name ?? 'Select assessment';
  const selectedTermLabel = TERM_OPTIONS.find((t) => t.value === selectedTerm)?.label ?? 'All terms';

  function exportCSV() {
    if (!currentAssessment || markEntries.length === 0) return;
    const rows = [
      [`Class: ${classDisplayName}`],
      [`Assessment: ${currentAssessment.name}`],
      [],
      ['Student Name', 'Admission Number', 'Mark', 'Total', 'Percentage'],
      ...markEntries.map((e) => {
        const pct = e.mark
          ? Math.round((Number(e.mark) / currentAssessment.totalMarks) * 100)
          : '';
        return [
          `${e.lastName} ${e.firstName}`,
          e.admissionNumber,
          e.mark,
          currentAssessment.totalMarks,
          pct !== '' ? `${pct}%` : '',
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classDisplayName} - ${currentAssessment.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gradebook" description="Enter and manage student assessment marks" />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Class:</span>
              <Select value={selectedClass} onValueChange={(val: unknown) => setSelectedClass(val as string)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select class">
                    {selectedClass ? classDisplayName : 'Select class'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade?.name ?? (cls as unknown as Record<string, unknown>).gradeName ?? ''} {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Subject:</span>
              <Select
                value={selectedSubject || 'all'}
                onValueChange={(val: unknown) => setSelectedSubject((val as string) === 'all' ? '' : (val as string))}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All subjects">{selectedSubjectName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Term:</span>
              <Select value={selectedTerm} onValueChange={(val: unknown) => setSelectedTerm(val as string)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="All terms">{selectedTermLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TERM_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Assessment:</span>
              <Select value={selectedAssessment} onValueChange={(val: unknown) => setSelectedAssessment(val as string)}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Select assessment">
                    {selectedAssessment ? selectedAssessmentName : 'Select assessment'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assessments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-1.5">
                        {getPaperId(a) && <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        {a.name} ({getSubjectName(a) || a.type})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:ml-auto">
              <Button variant="outline" onClick={() => window.location.href = '/teacher/curriculum/assessments'}>
                <FileText className="mr-2 h-4 w-4" />
                Create Assessment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No assessments empty state */}
      {selectedClass && assessments.length === 0 && !selectedAssessment && (
        <EmptyState
          icon={BookOpen}
          title="No assessments yet"
          description="Create an assessment paper in Curriculum → Assessments, then finalise it to capture marks here."
          action={
            <Button onClick={() => window.location.href = '/teacher/curriculum/assessments'}>
              Go to Assessments
            </Button>
          }
        />
      )}

      {/* Current assessment info + edit/delete */}
      {currentAssessment && (
        <AssessmentInfoCard
          assessment={currentAssessment}
          onEdit={() => setEditOpen(true)}
          onDelete={deleteAssessment}
        />
      )}

      <EditAssessmentDialog
        open={editOpen}
        assessment={currentAssessment ?? null}
        onClose={() => setEditOpen(false)}
        onUpdate={async (id, payload) => { await updateAssessment(id, payload); }}
      />

      {classStats && currentAssessment && (
        <ClassStatsBar stats={classStats} totalMarks={currentAssessment.totalMarks} />
      )}

      {/* Marks table */}
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
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground w-32 whitespace-nowrap">
                      Marks (/{currentAssessment?.totalMarks ?? 100})
                    </th>
                    <th className="py-2 text-left text-sm font-medium text-muted-foreground w-20">%</th>
                  </tr>
                </thead>
                <tbody>
                  {markEntries.map((entry, index) => {
                    const numericMark = Number(entry.mark);
                    const percentage = entry.mark && currentAssessment
                      ? Math.round((numericMark / currentAssessment.totalMarks) * 100)
                      : null;
                    const error = getMarkError(entry.studentId);
                    return (
                      <tr key={entry.studentId} className="border-b last:border-0">
                        <td className="py-3 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="py-3 text-sm font-medium truncate max-w-50">
                          <button
                            type="button"
                            className="hover:underline text-left"
                            onClick={() => setSelectedStudent(entry)}
                          >
                            {entry.lastName}, {entry.firstName}
                          </button>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">{entry.admissionNumber}</td>
                        <td className="py-3">
                          <div>
                            <Input
                              type="number"
                              min={0}
                              max={currentAssessment?.totalMarks ?? 100}
                              value={entry.mark}
                              onChange={(e) => handleMarkChange(entry.studentId, e.target.value)}
                              placeholder="Enter marks"
                              className={`w-full sm:w-28 ${error ? 'border-destructive' : ''}`}
                            />
                            {error && (
                              <p className="text-xs text-destructive mt-1">{error}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          {percentage !== null && !isNaN(percentage) ? (
                            <span className={`text-sm font-semibold ${percentage >= 80 ? 'text-primary' : percentage >= 50 ? 'text-blue-600' : 'text-destructive'}`}>
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
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {isDirty && (
                <div className="mr-auto flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  You have unsaved changes
                </div>
              )}
              <Button variant="outline" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={saveMarks} disabled={saving || hasValidationErrors || !isDirty}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Marks'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <StudentHistoryDialog
        student={selectedStudent}
        history={studentHistory}
        onClose={() => setSelectedStudent(null)}
        onFetchHistory={fetchStudentHistory}
      />
    </div>
  );
}
