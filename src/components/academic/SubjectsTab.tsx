'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useSubjects, useGrades } from '@/hooks/useAcademics';
import { useSubjectMutations } from '@/hooks/useAcademicMutations';
import { useCan } from '@/hooks/useCan';
import type { Subject, Grade } from '@/types';

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  gradeNames: string;
  gradeIds: string[];
}

function toSubjectRow(s: Subject): SubjectRow {
  const rawGradeIds = (s as unknown as Record<string, unknown>).gradeIds;
  let gradeNames = '';
  let gradeIds: string[] = [];
  if (Array.isArray(rawGradeIds)) {
    gradeIds = rawGradeIds.map((g: unknown) => {
      if (typeof g === 'string') return g;
      return ((g as Record<string, unknown>)?._id as string) ?? ((g as Record<string, unknown>)?.id as string) ?? '';
    });
    gradeNames = rawGradeIds
      .map((g: unknown) => (typeof g === 'object' && g !== null ? (g as Record<string, unknown>).name as string : ''))
      .filter(Boolean)
      .join(', ');
  }
  return { id: s.id, name: s.name, code: s.code, gradeNames, gradeIds };
}

export function SubjectsTab() {
  const { subjects, loading, refetch } = useSubjects();
  const { grades } = useGrades();
  const { createSubject, updateSubject, deleteSubject } = useSubjectMutations();
  const canManage = useCan('manage_academic_setup');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [form, setForm] = useState({ name: '', code: '', selectedGrades: [] as string[] });

  const rows = subjects.map(toSubjectRow);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', code: '', selectedGrades: [] });
    setDialogOpen(true);
  }

  function openEdit(row: SubjectRow) {
    setEditing(row);
    setForm({ name: row.name, code: row.code, selectedGrades: row.gradeIds });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      const payload = {
        name: form.name,
        code: form.code,
        gradeIds: form.selectedGrades,
      };
      if (editing) {
        await updateSubject(editing.id, payload);
        toast.success('Subject updated');
      } else {
        await createSubject(payload);
        toast.success('Subject created');
      }
      setDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save subject'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSubject(id);
      toast.success('Subject deleted');
      refetch();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete subject'));
    }
  }

  function toggleGrade(gradeId: string) {
    setForm((f) => ({
      ...f,
      selectedGrades: f.selectedGrades.includes(gradeId)
        ? f.selectedGrades.filter((g) => g !== gradeId)
        : [...f.selectedGrades, gradeId],
    }));
  }

  const columns: ColumnDef<SubjectRow>[] = [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Subject Name' },
    {
      id: 'grades',
      header: 'Grades',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.gradeNames || 'None'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => canManage ? (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)} aria-label="Edit subject">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(row.original.id)} aria-label="Delete subject">
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ) : null,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add Subject
          </Button>
        )}
      </div>

      <DataTable columns={columns} data={rows} searchKey="name" searchPlaceholder="Search subjects..." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />
            </div>
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. MATH" />
            </div>
            <div>
              <Label>Grades</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {grades.map((g: Grade) => (
                  <label key={g.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.selectedGrades.includes(g.id)}
                      onCheckedChange={() => toggleGrade(g.id)}
                    />
                    {g.name}
                  </label>
                ))}
              </div>
              {grades.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No grades available. Create grades first.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!form.name || !form.code}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
