'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { CardGridSkeleton } from '@/components/shared/skeletons';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ClassFormDialog } from '@/components/classes/ClassFormDialog';
import { StudentAddDialog } from '@/components/classes/StudentAddDialog';
import { AssignStudentDialog } from '@/components/classes/AssignStudentDialog';
import { ClassRosterDialog } from '@/components/classes/ClassRosterDialog';
import { InviteStudentDialog } from '@/components/classes/InviteStudentDialog';
import { ClassCard } from '@/components/classes/ClassCard';
import { BookOpen, Plus, Search } from 'lucide-react';
import { resolveId } from '@/lib/api-helpers';
import { useClassesPageState, entryKey } from '@/hooks/useClassesPageState';
import { useAuthStore } from '@/stores/useAuthStore';
import type { TeacherClassEntry } from '@/hooks/useTeacherClasses';
import type { Student } from '@/types';

export default function TeacherClassesPage() {
  const user = useAuthStore((state) => state.user);
  const isStandaloneTeacher = user?.isStandaloneTeacher === true;
  const entityLabel = isStandaloneTeacher ? 'Teaching Group' : 'Class';
  const entityLabelPlural = isStandaloneTeacher ? 'Teaching Groups' : 'Classes';
  const learnerLabel = isStandaloneTeacher ? 'learners' : 'students';
  const {
    entries, allStudents, loading, grades, description,
    selectedEntry, distinctSubjects, filteredEntries,
    showCreateDialog, setShowCreateDialog,
    createLoading,
    setSelectedKey,
    showAddStudent, setShowAddStudent,
    addStudentLoading,
    deleteTarget, setDeleteTarget,
    invitingId,
    inviteTarget, setInviteTarget,
    showAssignStudent, setShowAssignStudent,
    editEntry, setEditEntry,
    editLoading,
    search, setSearch,
    setSort,
    setFilterGrade,
    setFilterSubject,
    handleCreateClass, handleDelete, handleAddStudent,
    handleEditClass, handleRemoveStudent, handleInviteSubmit,
    handleAssignStudent,
  } = useClassesPageState();

  // Tracks which entry the AddStudentDialog should target. Set when the user
  // either clicks the "Add learners" icon on a card OR the "Add Learners"
  // button inside the open roster. Kept distinct from `selectedKey` so the
  // roster doesn't auto-open behind the add dialog.
  const [addTargetEntry, setAddTargetEntry] = useState<TeacherClassEntry | null>(null);

  const openAddStudent = (entry: TeacherClassEntry) => {
    setAddTargetEntry(entry);
    setShowAddStudent(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={isStandaloneTeacher ? 'Teaching Groups' : 'My Classes'}
          description={
            isStandaloneTeacher
              ? 'Organise work by grade and subject. Add learners later when you are ready for digital assignments.'
              : 'Manage your classes and student rosters'
          }
        />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStandaloneTeacher ? 'Teaching Groups' : 'My Classes'}
        description={
          isStandaloneTeacher
            ? 'Use groups as folders for lesson plans, resources, homework, and papers. Students are optional until you choose to invite them.'
            : description
        }
      >
        <Button onClick={() => setShowCreateDialog(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Create {entityLabel}
        </Button>
      </PageHeader>

      {entries.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${entityLabelPlural.toLowerCase()}...`} className="pl-9" />
          </div>
          <Select onValueChange={(val: unknown) => setSort(val as string)} defaultValue="name-asc">
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="students-desc">Most {learnerLabel}</SelectItem>
              <SelectItem value="students-asc">Least {learnerLabel}</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(val: unknown) => setFilterGrade(val as string)} defaultValue="all">
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All grades</SelectItem>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(val: unknown) => setFilterSubject(val as string)} defaultValue="all">
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {!isStandaloneTeacher && (
                <SelectItem value="homeroom">Homeroom only</SelectItem>
              )}
              {distinctSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredEntries.length === 0 && entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={`No ${entityLabelPlural.toLowerCase()} yet`}
          description={
            isStandaloneTeacher
              ? 'Create a teaching group like Grade 12 Accounting. You can print/PDF work now and add learners later.'
              : 'Create your first class to get started.'
          }
          action={<Button onClick={() => setShowCreateDialog(true)}><Plus className="mr-1 h-4 w-4" /> Create {entityLabel}</Button>}
        />
      ) : filteredEntries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No classes match &quot;{search}&quot;</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.filter((e) => e.class && typeof e.class === 'object').map((entry) => (
            <ClassCard
              key={entryKey(entry)}
              entry={entry}
              entryKey={entryKey(entry)}
              copyMode={isStandaloneTeacher ? 'teachingGroup' : 'class'}
              onViewRoster={() => setSelectedKey(entryKey(entry))}
              onAddStudents={() => openAddStudent(entry)}
              onEdit={() => setEditEntry(entry)}
              onDelete={() => setDeleteTarget(resolveId(entry.class))}
            />
          ))}
        </div>
      )}

      <ClassRosterDialog entry={selectedEntry} onClose={() => setSelectedKey(null)}
        copyMode={isStandaloneTeacher ? 'teachingGroup' : 'class'}
        onInvite={(student: Student) => setInviteTarget(student)} invitingId={invitingId}
        onAddStudents={() => { if (selectedEntry) openAddStudent(selectedEntry); }}
        onRemoveStudent={handleRemoveStudent}
      />

      <InviteStudentDialog student={inviteTarget} onClose={() => setInviteTarget(null)}
        onInvite={handleInviteSubmit} isLoading={invitingId === inviteTarget?.id} />

      <ClassFormDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}
        copyMode={isStandaloneTeacher ? 'teachingGroup' : 'class'}
        onSubmit={handleCreateClass} grades={grades} isLoading={createLoading} />

      {editEntry && (
        <ClassFormDialog open={!!editEntry} onOpenChange={(o) => { if (!o) setEditEntry(null); }}
          onSubmit={handleEditClass}
          copyMode={isStandaloneTeacher ? 'teachingGroup' : 'class'}
          grades={grades}
          initialData={{
            name: editEntry.class.name,
            gradeId: resolveId(editEntry.class.gradeId) || resolveId(editEntry.class.grade),
            capacity: editEntry.class.capacity ?? 35,
            subjectId: editEntry.subject?.id,
            isHomeroom: editEntry.isHomeroom === true,
          }}
          isLoading={editLoading} />
      )}

      <StudentAddDialog
        open={showAddStudent}
        onOpenChange={(o) => {
          setShowAddStudent(o);
          if (!o) setAddTargetEntry(null);
        }}
        onAddStudent={(data) => handleAddStudent(data, addTargetEntry)}
        isLoading={addStudentLoading}
      />

      <AssignStudentDialog open={showAssignStudent} onOpenChange={setShowAssignStudent}
        classId={resolveId(selectedEntry?.class)}
        currentStudentIds={selectedEntry?.students.map((s: Student) => s.id) ?? []} allStudents={allStudents}
        onAssign={handleAssignStudent} />

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Delete ${entityLabel}`} description={`Are you sure you want to delete this ${entityLabel.toLowerCase()}? This action cannot be undone.`}
        confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
