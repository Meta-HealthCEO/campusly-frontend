'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, Pencil, Trash2, GraduationCap, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useGrades, useClasses, useStaff } from '@/hooks/useAcademics';
import { useGradeMutations, useClassMutations } from '@/hooks/useAcademicMutations';
import { useCan } from '@/hooks/useCan';
import type { Grade, SchoolClass } from '@/types';
import type { StaffMember } from '@/hooks/useAcademics';

interface GradeForm { name: string; orderIndex: string }
interface ClassForm { name: string; teacherId: string; capacity: string }

export function GradeClassesTab() {
  const { grades, loading: gradesLoading, refetch: refetchGrades } = useGrades();
  const { classes, loading: classesLoading, refetch: refetchClasses } = useClasses();
  const { staff } = useStaff();
  const { createGrade, updateGrade, deleteGrade } = useGradeMutations();
  const { createClass, updateClass, deleteClass } = useClassMutations();
  const canManage = useCan('manage_academic_setup');

  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classGradeId, setClassGradeId] = useState<string>('');
  const [gradeForm, setGradeForm] = useState<GradeForm>({ name: '', orderIndex: '0' });
  const [classForm, setClassForm] = useState<ClassForm>({ name: '', teacherId: '', capacity: '30' });

  const loading = gradesLoading || classesLoading;

  function openGradeCreate() {
    setEditingGrade(null);
    setGradeForm({ name: '', orderIndex: String(grades.length) });
    setGradeDialogOpen(true);
  }

  function openGradeEdit(grade: Grade) {
    setEditingGrade(grade);
    setGradeForm({ name: grade.name, orderIndex: String((grade as unknown as Record<string, unknown>).orderIndex ?? 0) });
    setGradeDialogOpen(true);
  }

  function openClassCreate(gradeId: string) {
    setEditingClass(null);
    setClassGradeId(gradeId);
    setClassForm({ name: '', teacherId: '', capacity: '30' });
    setClassDialogOpen(true);
  }

  function openClassEdit(cls: SchoolClass) {
    setEditingClass(cls);
    setClassGradeId(cls.gradeId);
    const tRef = cls.teacherId as unknown as Record<string, unknown> | string | undefined;
    const tid = typeof tRef === 'string' ? tRef : (tRef?._id as string) ?? '';
    setClassForm({ name: cls.name, teacherId: tid, capacity: String(cls.capacity) });
    setClassDialogOpen(true);
  }

  async function handleGradeSubmit() {
    try {
      const payload = { name: gradeForm.name, orderIndex: Number(gradeForm.orderIndex) };
      if (editingGrade) {
        await updateGrade(editingGrade.id, payload);
        toast.success('Grade updated');
      } else {
        await createGrade(payload);
        toast.success('Grade created');
      }
      setGradeDialogOpen(false);
      refetchGrades();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save grade'));
    }
  }

  async function handleGradeDelete(id: string) {
    try {
      await deleteGrade(id);
      toast.success('Grade deleted');
      refetchGrades();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete grade'));
    }
  }

  async function handleClassSubmit() {
    try {
      const payload = {
        name: classForm.name,
        gradeId: classGradeId,
        teacherId: classForm.teacherId,
        capacity: Number(classForm.capacity),
      };
      if (editingClass) {
        await updateClass(editingClass.id, payload);
        toast.success('Class updated');
      } else {
        await createClass(payload);
        toast.success('Class created');
      }
      setClassDialogOpen(false);
      refetchClasses();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save class'));
    }
  }

  async function handleClassDelete(id: string) {
    try {
      await deleteClass(id);
      toast.success('Class deleted');
      refetchClasses();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete class'));
    }
  }

  function getTeacherName(cls: SchoolClass): string {
    const t = cls.teacher ?? cls.teacherId;
    if (typeof t === 'object' && t !== null) {
      const u = t as unknown as Record<string, unknown>;
      return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    }
    return '';
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button onClick={openGradeCreate} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add Grade
          </Button>
        )}
      </div>

      {grades.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No grades" description="No grades have been set up yet." />
      ) : (
        grades
          .sort((a, b) => ((a as unknown as Record<string, unknown>).orderIndex as number ?? 0) - ((b as unknown as Record<string, unknown>).orderIndex as number ?? 0))
          .map((grade) => {
            const gradeClasses = classes.filter((c) => {
              const gId = typeof c.gradeId === 'object' && c.gradeId !== null
                ? ((c.gradeId as Record<string, unknown>)._id as string) ?? ((c.gradeId as Record<string, unknown>).id as string)
                : c.gradeId;
              return gId === grade.id;
            });
            const isExpanded = expandedGrade === grade.id;
            return (
              <GradeCardItem
                key={grade.id}
                grade={grade}
                gradeClasses={gradeClasses}
                isExpanded={isExpanded}
                canManage={canManage}
                onToggle={() => setExpandedGrade(isExpanded ? null : grade.id)}
                onEditGrade={() => openGradeEdit(grade)}
                onDeleteGrade={() => handleGradeDelete(grade.id)}
                onAddClass={() => openClassCreate(grade.id)}
                onEditClass={openClassEdit}
                onDeleteClass={(id) => handleClassDelete(id)}
                getTeacherName={getTeacherName}
              />
            );
          })
      )}

      {/* Grade Form Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGrade ? 'Edit Grade' : 'Add Grade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={gradeForm.name} onChange={(e) => setGradeForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Grade 7" />
            </div>
            <div>
              <Label>Order Index</Label>
              <Input type="number" min={0} value={gradeForm.orderIndex} onChange={(e) => setGradeForm((f) => ({ ...f, orderIndex: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleGradeSubmit} disabled={!gradeForm.name}>{editingGrade ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Form Dialog */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit Class' : 'Add Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={classForm.name} onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. 7A" />
            </div>
            <div>
              <Label>Home Teacher</Label>
              <Select value={classForm.teacherId} onValueChange={(val: unknown) => setClassForm((f) => ({ ...f, teacherId: val as string }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {(staff as StaffMember[]).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" min={1} value={classForm.capacity} onChange={(e) => setClassForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleClassSubmit} disabled={!classForm.name}>{editingClass ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Extracted to keep parent under 350 lines
interface GradeCardItemProps {
  grade: Grade;
  gradeClasses: SchoolClass[];
  isExpanded: boolean;
  canManage: boolean;
  onToggle: () => void;
  onEditGrade: () => void;
  onDeleteGrade: () => void;
  onAddClass: () => void;
  onEditClass: (cls: SchoolClass) => void;
  onDeleteClass: (id: string) => void;
  getTeacherName: (cls: SchoolClass) => string;
}

function GradeCardItem({ grade, gradeClasses, isExpanded, canManage, onToggle, onEditGrade, onDeleteGrade, onAddClass, onEditClass, onDeleteClass, getTeacherName }: GradeCardItemProps) {
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>{grade.name}</span>
            <Badge variant="secondary">{gradeClasses.length} classes</Badge>
          </div>
          {canManage && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon-sm" onClick={onEditGrade} aria-label="Edit grade"><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={onDeleteGrade} aria-label="Delete grade"><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          {canManage && (
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={onAddClass}><Plus className="mr-1 h-3 w-3" /> Add Class</Button>
            </div>
          )}
          {gradeClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes in this grade.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gradeClasses.map((cls) => (
                <div key={cls.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{cls.name}</p>
                    <Badge variant="outline" className="text-xs">{cls.studentCount ?? 0}/{cls.capacity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{getTeacherName(cls) || 'No teacher assigned'}</p>
                  {canManage && (
                    <div className="flex gap-1 pt-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => onEditClass(cls)} aria-label="Edit class"><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => onDeleteClass(cls.id)} aria-label="Delete class"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
