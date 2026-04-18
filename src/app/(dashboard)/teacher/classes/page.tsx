'use client';

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
import type { Student } from '@/types';

export default function TeacherClassesPage() {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Classes" description="Manage your classes and student rosters" />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Classes" description={description}>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Create Class
        </Button>
      </PageHeader>

      {entries.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classes..." className="pl-9" />
          </div>
          <Select onValueChange={(val: unknown) => setSort(val as string)} defaultValue="name-asc">
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="students-desc">Most students</SelectItem>
              <SelectItem value="students-asc">Least students</SelectItem>
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
              <SelectItem value="homeroom">Homeroom only</SelectItem>
              {distinctSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredEntries.length === 0 && entries.length === 0 ? (
        <EmptyState icon={BookOpen} title="No classes yet" description="Create your first class to get started."
          action={<Button onClick={() => setShowCreateDialog(true)}><Plus className="mr-1 h-4 w-4" /> Create Class</Button>} />
      ) : filteredEntries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No classes match &quot;{search}&quot;</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.filter((e) => e.class && typeof e.class === 'object').map((entry) => (
            <ClassCard
              key={entryKey(entry)}
              entry={entry}
              entryKey={entryKey(entry)}
              onClick={() => setSelectedKey(entryKey(entry))}
              onEdit={() => setEditEntry(entry)}
              onDelete={() => setDeleteTarget(resolveId(entry.class))}
            />
          ))}
        </div>
      )}

      <ClassRosterDialog entry={selectedEntry} onClose={() => setSelectedKey(null)}
        onInvite={(student: Student) => setInviteTarget(student)} invitingId={invitingId}
        onAddStudents={() => setShowAddStudent(true)} onAssignExisting={() => setShowAssignStudent(true)}
        onRemoveStudent={handleRemoveStudent}
      />

      <InviteStudentDialog student={inviteTarget} onClose={() => setInviteTarget(null)}
        onInvite={handleInviteSubmit} isLoading={invitingId === inviteTarget?.id} />

      <ClassFormDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateClass} grades={grades} isLoading={createLoading} />

      {editEntry && (
        <ClassFormDialog open={!!editEntry} onOpenChange={(o) => { if (!o) setEditEntry(null); }}
          onSubmit={handleEditClass}
          grades={grades}
          initialData={{ name: editEntry.class.name, gradeId: editEntry.class.gradeId ?? resolveId(editEntry.class.grade), capacity: editEntry.class.capacity ?? 35, subjectId: editEntry.subject?.id }}
          isLoading={editLoading} />
      )}

      <StudentAddDialog open={showAddStudent} onOpenChange={setShowAddStudent} onAddStudent={handleAddStudent} isLoading={addStudentLoading} />

      <AssignStudentDialog open={showAssignStudent} onOpenChange={setShowAssignStudent}
        classId={resolveId(selectedEntry?.class)}
        currentStudentIds={selectedEntry?.students.map((s: Student) => s.id) ?? []} allStudents={allStudents}
        onAssign={handleAssignStudent} />

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Class" description="Are you sure you want to delete this class? This action cannot be undone."
        confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
