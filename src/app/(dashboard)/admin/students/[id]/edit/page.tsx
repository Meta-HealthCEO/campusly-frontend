'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useStudentFormOptions } from '@/hooks/useStudentForm';
import { updateStudent } from '@/hooks/useStudentProfile';
import { fetchStudentById } from '@/hooks/useStudents';
import type { Student, EnrollmentStatus } from '@/types';

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { grades, classes, loading: optionsLoading } = useStudentFormOptions();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm<{
    gradeId: string;
    classId: string;
    enrollmentStatus: EnrollmentStatus;
    homeLanguage: string;
    previousSchool: string;
    transportRequired: boolean;
    afterCareRequired: boolean;
  }>();

  useEffect(() => {
    async function loadStudent() {
      try {
        const s = await fetchStudentById(id);
        if (!s) {
          toast.error('Failed to load student');
          return;
        }
        setStudent(s);

        const gradeRaw = s.grade ?? s.gradeId;
        const classRaw = s.class ?? s.classId;
        const gradeId = typeof gradeRaw === 'object' && gradeRaw !== null ? (gradeRaw as { _id?: string; id?: string })._id ?? (gradeRaw as { id?: string }).id ?? '' : (gradeRaw as string) ?? '';
        const classId = typeof classRaw === 'object' && classRaw !== null ? (classRaw as { _id?: string; id?: string })._id ?? (classRaw as { id?: string }).id ?? '' : (classRaw as string) ?? '';

        setValue('gradeId', gradeId);
        setValue('classId', classId);
        setValue('enrollmentStatus', s.enrollmentStatus ?? 'active');
        setValue('homeLanguage', s.homeLanguage ?? '');
        setValue('previousSchool', s.previousSchool ?? '');
        setValue('transportRequired', s.transportRequired ?? false);
        setValue('afterCareRequired', s.afterCareRequired ?? false);
      } catch {
        toast.error('Failed to load student');
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [id, setValue]);

  const selectedGradeId = watch('gradeId');
  const filteredClasses = classes.filter((c) => c.gradeId === selectedGradeId || c.grade?.id === selectedGradeId);

  const onSubmit = async (data: Record<string, unknown>) => {
    const result = await updateStudent(id, data);
    if (result.success) {
      toast.success('Student updated successfully');
      router.push(`/admin/students/${id}`);
    } else {
      toast.error(result.error ?? 'Failed to update');
    }
  };

  if (loading || optionsLoading) return <LoadingSpinner />;
  if (!student) return <p className="text-destructive">Student not found</p>;

  const u = student.user ?? (student.userId as unknown as { firstName?: string; lastName?: string });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/students/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit: {u?.firstName} {u?.lastName}</h1>
          <p className="text-muted-foreground">{student.admissionNumber}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Update Student Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select value={selectedGradeId} onValueChange={(val: unknown) => { setValue('gradeId', val as string); setValue('classId', ''); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={watch('classId')} onValueChange={(val: unknown) => setValue('classId', val as string)} disabled={!selectedGradeId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map((cls) => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Enrollment Status</Label>
                <Select value={watch('enrollmentStatus')} onValueChange={(val: unknown) => setValue('enrollmentStatus', val as EnrollmentStatus)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['active', 'transferred', 'graduated', 'expelled', 'withdrawn'] as const).map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeLanguage">Home Language</Label>
                <Input id="homeLanguage" {...register('homeLanguage')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previousSchool">Previous School</Label>
                <Input id="previousSchool" {...register('previousSchool')} />
              </div>
              <div className="space-y-2 flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register('transportRequired')} />Transport Required
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register('afterCareRequired')} />Aftercare Required
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Link href={`/admin/students/${id}`}><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
