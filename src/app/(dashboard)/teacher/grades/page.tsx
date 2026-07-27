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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TermSummaryTab } from '@/components/grades/TermSummaryTab';
import { useTeacherGrades } from '@/hooks/useTeacherGrades';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
// Assessment creation now goes through the Papers builder.
import { EditAssessmentDialog } from '@/components/grades/EditAssessmentDialog';
import { StudentHistoryDialog } from '@/components/grades/StudentHistoryDialog';
import { ClassStatsBar } from '@/components/grades/ClassStatsBar';
import { AssessmentInfoCard } from '@/components/grades/AssessmentInfoCard';
import type { Assessment } from '@/types';
import { getSubjectName, getPaperId, TERM_OPTIONS, resolveTermScope } from '@/components/grades/grades-page-helpers';

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

  const captureContent = (
    <>
      {classStats && currentAssessment && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Snapshot for &ldquo;{currentAssessment.name}&rdquo; — these numbers cover this assessment only.
          </p>
          <ClassStatsBar stats={classStats} totalMarks={currentAssessment.totalMarks} />
        </div>
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Student Marks ({markEntries.length} students)</CardTitle>
        </CardHeader>
        <CardContent>
          {markEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {selectedAssessment ? 'No students found for this class.' : 'Select an assessment to capture marks.'}
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
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Gradebook" description="Track class performance and capture marks">
        <div className="flex items-center gap-2">
          <Select
            value={selectedClass}
            onValueChange={(val: unknown) => setSelectedClass(val as string)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Pick class">
                {selectedClass ? classDisplayName : 'Pick class'}
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
          <Select value={selectedTerm} onValueChange={(val: unknown) => setSelectedTerm(val as string)}>
            <SelectTrigger className="w-32">
              <SelectValue>{selectedTermLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {TERM_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {selectedClass ? (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Class overview</TabsTrigger>
            <TabsTrigger value="capture">Enter marks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <TermSummaryTab
              classId={selectedClass}
              term={resolveTermScope(selectedTerm)}
              academicYear={new Date().getFullYear()}
            />
          </TabsContent>

          <TabsContent value="capture" className="mt-4 space-y-4">
            {/* Capture-only pickers — Subject narrows, Assessment selects the
                row to enter marks for. Live here so the overview isn't
                cluttered with controls that don't apply. */}
            <Card>
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <Select
                  value={selectedSubject || 'all'}
                  onValueChange={(val: unknown) =>
                    setSelectedSubject((val as string) === 'all' ? '' : (val as string))
                  }
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

                <Select
                  value={selectedAssessment}
                  onValueChange={(val: unknown) => setSelectedAssessment(val as string)}
                >
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Pick assessment">
                      {selectedAssessment ? selectedAssessmentName : 'Pick assessment'}
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
              </CardContent>
            </Card>

            {assessments.length === 0 && !selectedAssessment && (
              <EmptyState
                icon={BookOpen}
                title="No assessments for this term yet"
                description="Marks will appear here once a paper is finalised and assigned. Manage papers from the Test Papers section."
              />
            )}

            {currentAssessment && (
              <AssessmentInfoCard
                assessment={currentAssessment}
                onEdit={() => setEditOpen(true)}
                onDelete={deleteAssessment}
              />
            )}
            {captureContent}
          </TabsContent>
        </Tabs>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Pick a class to begin"
          description="Use the class picker in the header. Class overview rolls up every test for that class; Enter marks is the capture workflow."
        />
      )}

      <EditAssessmentDialog
        open={editOpen}
        assessment={currentAssessment ?? null}
        onClose={() => setEditOpen(false)}
        onUpdate={async (id, payload) => { await updateAssessment(id, payload); }}
      />

      <StudentHistoryDialog
        student={selectedStudent}
        history={studentHistory}
        onClose={() => setSelectedStudent(null)}
        onFetchHistory={fetchStudentHistory}
      />
    </div>
  );
}
