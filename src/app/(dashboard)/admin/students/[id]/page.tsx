'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, GraduationCap, CreditCard, CalendarCheck, Heart, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PersonalTab } from '@/components/students/PersonalTab';
import { AcademicTab } from '@/components/students/AcademicTab';
import { FinancialTab } from '@/components/students/FinancialTab';
import { AttendanceTab } from '@/components/students/AttendanceTab';
import { MedicalProfileForm } from '@/components/students/MedicalProfileForm';
import { useStudentProfile, deleteStudent } from '@/hooks/useStudentProfile';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Student as StudentType } from '@/types';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  transferred: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  graduated: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  expelled: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

function getStudentUser(student: StudentType): { firstName: string; lastName: string } {
  if (student.user) return student.user;
  const populated = student.userId as unknown as { firstName?: string; lastName?: string } | undefined;
  if (typeof populated === 'object' && populated !== null && populated.firstName) {
    return { firstName: populated.firstName, lastName: populated.lastName ?? '' };
  }
  return { firstName: student.firstName ?? '', lastName: student.lastName ?? '' };
}

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { student, grades, invoices, attendance, loading, error, refetch } = useStudentProfile(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) return <LoadingSpinner />;

  if (error || !student) {
    return (
      <div className="space-y-6">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </Link>
        <EmptyState title="Student not found" description={error ?? 'The student you are looking for does not exist.'} />
      </div>
    );
  }

  const u = getStudentUser(student);
  const status = student.enrollmentStatus ?? 'active';

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteStudent(id);
    setDeleting(false);
    if (result.success) {
      toast.success('Student archived successfully');
      router.push('/admin/students');
    } else {
      toast.error(result.error ?? 'Failed to archive student');
    }
    setDeleteOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/students">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {u.firstName} {u.lastName}
            </h1>
            <p className="text-muted-foreground">{student.admissionNumber}</p>
          </div>
          <Badge className={statusStyles[status] ?? statusStyles.active}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/students/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger render={
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-1 h-4 w-4" />
                Archive
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Archive Student</DialogTitle>
                <DialogDescription>
                  Are you sure you want to archive {u.firstName} {u.lastName}? This will soft-delete the student record. Their attendance, grades, and invoices will be preserved.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Archiving...' : 'Archive Student'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal"><User className="mr-1 h-4 w-4" />Personal</TabsTrigger>
          <TabsTrigger value="academic"><GraduationCap className="mr-1 h-4 w-4" />Academic</TabsTrigger>
          <TabsTrigger value="financial"><CreditCard className="mr-1 h-4 w-4" />Financial</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarCheck className="mr-1 h-4 w-4" />Attendance</TabsTrigger>
          <TabsTrigger value="medical"><Heart className="mr-1 h-4 w-4" />Medical</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4"><PersonalTab student={student} /></TabsContent>
        <TabsContent value="academic" className="mt-4"><AcademicTab grades={grades} /></TabsContent>
        <TabsContent value="financial" className="mt-4"><FinancialTab invoices={invoices} /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab attendance={attendance} /></TabsContent>
        <TabsContent value="medical" className="mt-4">
          <MedicalProfileForm
            studentId={id}
            medicalProfile={student.medicalProfile ?? { allergies: [], conditions: [], emergencyContacts: [] }}
            onSaved={refetch}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
