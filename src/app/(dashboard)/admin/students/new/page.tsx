'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { studentSchema, type StudentFormData } from '@/lib/validations';
import { useStudentFormOptions, createStudent } from '@/hooks/useStudentForm';
import { useAuthStore } from '@/stores/useAuthStore';

export default function NewStudentPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { grades, classes, parents, loading: optionsLoading } = useStudentFormOptions();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      gender: undefined,
      gradeId: '',
      classId: '',
      admissionNumber: '',
      guardianId: '',
      homeLanguage: '',
    },
  });

  const selectedGradeId = watch('gradeId');
  const filteredClasses = classes.filter((c) => c.gradeId === selectedGradeId || c.grade?.id === selectedGradeId);

  const onSubmit = async (data: StudentFormData) => {
    const schoolId = user?.schoolId;
    if (!schoolId) {
      toast.error('School context not found');
      return;
    }

    const result = await createStudent(data, schoolId);
    if (result.success) {
      toast.success('Student enrolled successfully!');
      router.push('/admin/students');
    } else {
      toast.error(result.error ?? 'Failed to create student');
    }
  };

  if (optionsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Student</h1>
          <p className="text-muted-foreground">Enrol a new student into the system</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} placeholder="Enter first name" />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} placeholder="Enter last name" />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="student@school.co.za" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admissionNumber">Admission Number</Label>
                <Input id="admissionNumber" {...register('admissionNumber')} placeholder="e.g. 2026-001" />
                {errors.admissionNumber && <p className="text-xs text-destructive">{errors.admissionNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <Select onValueChange={(val: unknown) => setValue('gender', val as StudentFormData['gender'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Grade</Label>
                <Select
                  onValueChange={(val: unknown) => {
                    setValue('gradeId', val as string);
                    setValue('classId', '');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.gradeId && <p className="text-xs text-destructive">{errors.gradeId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  onValueChange={(val: unknown) => setValue('classId', val as string)}
                  disabled={!selectedGradeId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedGradeId ? 'Select class' : 'Select a grade first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Parent / Guardian</Label>
                <Select onValueChange={(val: unknown) => setValue('guardianId', val as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((parent) => {
                      const pu = parent.user ?? (parent.userId as unknown as { firstName: string; lastName: string });
                      return (
                        <SelectItem key={parent.id} value={parent.id}>
                          {pu?.firstName} {pu?.lastName} ({parent.relationship})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeLanguage">Home Language</Label>
                <Input id="homeLanguage" {...register('homeLanguage')} placeholder="e.g. Zulu, English" />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Link href="/admin/students">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enrolling...' : 'Add Student'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
